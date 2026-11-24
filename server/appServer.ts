import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import {
  createSessionToken,
  resolveConfinedPath,
  verifySessionToken,
} from './authAndStore.ts';
import { KineticDatabase } from './db.ts';
import type {
  PortalNutritionPlan,
  PortalSupplementItem,
  PortalWeeklyGoal,
  PortalWorkoutDay,
} from '../src/utils/portalPlanning.ts';
import { mergeSiteContentBundle } from '../src/utils/cmsSchema.ts';

export interface AppServerOptions {
  dbPath?: string;
  legacyDataDir?: string;
  sessionSecret?: Buffer;
  envUsername?: string;
  envPasscode?: string;
  mountFrontend?: 'vite' | 'static' | 'none';
}

interface AuthenticatedRequest extends Request {
  adminUser?: string;
  portalAccountId?: string;
  portalUsername?: string;
  portalDisplayName?: string;
}

interface ChatClientSocket extends WebSocket {
  role: 'admin' | 'portal';
  senderName: string;
  roomAccountId: string;
  tokenExp: number;
  isAlive: boolean;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

export async function createAppServer(options: AppServerOptions = {}) {
  const dataDir = path.resolve(process.cwd(), '.data');
  const dbPath =
    options.dbPath ?? resolveConfinedPath(dataDir, 'kinetic.db');
  const db = new KineticDatabase(dbPath);
  if (options.legacyDataDir !== '') {
    db.migrateLegacyJsonIfNeeded(options.legacyDataDir ?? dataDir);
  }

  const sessionSecret =
    options.sessionSecret ??
    (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
      ? Buffer.from(process.env.SESSION_SECRET, 'utf8')
      : crypto.randomBytes(32));

  const getEnvUsername = () => options.envUsername ?? process.env.ADMIN_USERNAME;
  const getEnvPasscode = () => options.envPasscode ?? process.env.ADMIN_PASSCODE;

  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  app.use(express.json({ limit: '2mb' }));

  const loginFailureMap = new Map<string, { count: number; resetAt: number }>();
  const MAX_LOGIN_FAILURES = 25;
  const LOGIN_WINDOW_MS = 10 * 60 * 1000;

  function getClientIpKey(req: Request, bucket: string): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${bucket}:${ip}`;
  }

  function isLoginThrottled(key: string): boolean {
    const now = Date.now();
    const rec = loginFailureMap.get(key);
    if (!rec) return false;
    if (now > rec.resetAt) {
      loginFailureMap.delete(key);
      return false;
    }
    return rec.count >= MAX_LOGIN_FAILURES;
  }

  function recordLoginFailure(key: string) {
    const now = Date.now();
    if (loginFailureMap.size > 1000) {
      for (const [k, v] of loginFailureMap) {
        if (now > v.resetAt) loginFailureMap.delete(k);
      }
    }
    const existing = loginFailureMap.get(key);
    if (!existing || now > existing.resetAt) {
      loginFailureMap.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    } else {
      existing.count += 1;
    }
  }

  function clearLoginFailures(key: string) {
    loginFailureMap.delete(key);
  }

  function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const verified = verifySessionToken(token, sessionSecret);
    if (!verified || verified.role !== 'admin') {
      res.status(401).json({ error: 'Invalid or expired admin session' });
      return;
    }
    req.adminUser = verified.sub;
    next();
  }

  function requirePortalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Portal authentication required' });
      return;
    }
    const verified = verifySessionToken(token, sessionSecret);
    if (!verified || verified.role !== 'portal' || !verified.accountId) {
      res.status(401).json({ error: 'Invalid or expired portal session' });
      return;
    }
    const account = db.getPortalAccountById(verified.accountId);
    if (!account || account.active === false) {
      res.status(401).json({ error: 'Portal account is disabled or no longer exists' });
      return;
    }
    req.portalAccountId = account.id;
    req.portalUsername = account.username;
    req.portalDisplayName = account.displayName;
    next();
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const roomClients = new Map<string, Set<ChatClientSocket>>();

  function joinRoom(socket: ChatClientSocket, accountId: string) {
    if (socket.roomAccountId) {
      const oldSet = roomClients.get(socket.roomAccountId);
      oldSet?.delete(socket);
      if (oldSet && oldSet.size === 0) {
        roomClients.delete(socket.roomAccountId);
      }
    }
    socket.roomAccountId = accountId;
    if (accountId) {
      let set = roomClients.get(accountId);
      if (!set) {
        set = new Set();
        roomClients.set(accountId, set);
      }
      set.add(socket);
    }
  }

  function leaveAllRooms(socket: ChatClientSocket) {
    if (!socket.roomAccountId) return;
    const set = roomClients.get(socket.roomAccountId);
    set?.delete(socket);
    if (set && set.size === 0) {
      roomClients.delete(socket.roomAccountId);
    }
    socket.roomAccountId = '';
  }

  function broadcastToAccountRoom(accountId: string, payload: unknown) {
    const set = roomClients.get(accountId);
    if (!set || set.size === 0) return;
    const raw = JSON.stringify(payload);
    for (const client of set) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  }

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const parsedUrl = new URL(request.url ?? '/', 'http://localhost');
      if (parsedUrl.pathname !== '/ws/chat') {
        socket.destroy();
        return;
      }

      const token = parsedUrl.searchParams.get('token') ?? '';
      const requestedAccountId = parsedUrl.searchParams.get('accountId') ?? '';
      const verified = verifySessionToken(token, sessionSecret);
      if (!verified) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      if (verified.role === 'portal') {
        if (!verified.accountId) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        const account = db.getPortalAccountById(verified.accountId);
        if (!account || !account.active) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          const client = ws as ChatClientSocket;
          client.role = 'portal';
          client.senderName = account.displayName || account.username;
          client.tokenExp = verified.exp;
          client.isAlive = true;
          joinRoom(client, account.id);
          wss.emit('connection', client, request);
        });
        return;
      }

      // Admin WS connection
      if (requestedAccountId) {
        const account = db.getPortalAccountById(requestedAccountId);
        if (!account) {
          socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
          socket.destroy();
          return;
        }
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        const client = ws as ChatClientSocket;
        client.role = 'admin';
        client.senderName = verified.sub;
        client.tokenExp = verified.exp;
        client.isAlive = true;
        joinRoom(client, requestedAccountId);
        wss.emit('connection', client, request);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    const client = ws as ChatClientSocket;

    if (client.roomAccountId) {
      const history = db.listChatMessages(client.roomAccountId, 200);
      client.send(
        JSON.stringify({
          type: 'chat:history',
          accountId: client.roomAccountId,
          messages: history,
        })
      );
    }

    client.on('pong', () => {
      client.isAlive = true;
    });

    client.on('message', (data) => {
      try {
        if (Date.now() > client.tokenExp) {
          client.close(4401, 'Session expired');
          return;
        }

        const parsed = JSON.parse(data.toString('utf8')) as {
          type?: unknown;
          accountId?: unknown;
          body?: unknown;
        };

        if (parsed.type === 'chat:join' && client.role === 'admin') {
          const nextAccId = typeof parsed.accountId === 'string' ? parsed.accountId : '';
          if (nextAccId && db.getPortalAccountById(nextAccId)) {
            joinRoom(client, nextAccId);
            const history = db.listChatMessages(nextAccId, 200);
            client.send(
              JSON.stringify({
                type: 'chat:history',
                accountId: nextAccId,
                messages: history,
              })
            );
          }
          return;
        }

        if (parsed.type === 'chat:send') {
          if (client.role === 'portal') {
            const liveAcc = db.getPortalAccountById(client.roomAccountId);
            if (!liveAcc || !liveAcc.active) {
              client.close(4403, 'Portal account disabled');
              return;
            }
          }

          const targetAccountId =
            client.role === 'portal'
              ? client.roomAccountId
              : typeof parsed.accountId === 'string' && parsed.accountId
                ? parsed.accountId
                : client.roomAccountId;

          const bodyText = typeof parsed.body === 'string' ? parsed.body : '';
          if (!targetAccountId || !bodyText.trim()) return;

          const saved = db.addChatMessage(
            targetAccountId,
            client.role,
            client.senderName,
            bodyText
          );
          if (saved) {
            broadcastToAccountRoom(targetAccountId, {
              type: 'chat:message',
              message: saved,
            });
          }
        }
      } catch {
        // Ignore malformed WS payloads
      }
    });

    client.on('close', () => {
      leaveAllRooms(client);
    });
  });

  const heartbeatInterval = setInterval(() => {
    for (const client of wss.clients) {
      const chatClient = client as ChatClientSocket;
      if (!chatClient.isAlive) {
        chatClient.terminate();
        continue;
      }
      chatClient.isAlive = false;
      chatClient.ping();
    }
  }, 30_000);
  heartbeatInterval.unref();

  // --- Admin Auth Routes ---
  app.get('/api/admin/status', (_req, res) => {
    res.json(db.getAdminAuthStatus(getEnvUsername(), getEnvPasscode()));
  });

  app.post('/api/admin/claim', (req, res) => {
    const body = req.body as { username?: unknown; password?: unknown } | undefined;
    const username = typeof body?.username === 'string' ? body.username : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const result = db.claimAdminCredentials(username, password, getEnvPasscode());
    if (result.ok === false) {
      if (result.code === 'ALREADY_CONFIGURED') {
        res.status(409).json({ error: 'Admin account is already configured' });
        return;
      }
      res
        .status(400)
        .json({ error: 'Username (min 3 chars) and password (min 8 chars) are required' });
      return;
    }

    const token = createSessionToken(result.username, sessionSecret);
    res.status(201).json({ token, username: result.username, mode: 'claimed' });
  });

  app.post('/api/admin/login', (req, res) => {
    const rateKey = getClientIpKey(req, 'admin');
    if (isLoginThrottled(rateKey)) {
      res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
      return;
    }

    const body = req.body as { username?: unknown; password?: unknown } | undefined;
    const username = typeof body?.username === 'string' ? body.username : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const verified = db.verifyAdminCredentials(
      username,
      password,
      getEnvUsername(),
      getEnvPasscode()
    );
    if (verified.ok === false) {
      recordLoginFailure(rateKey);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    clearLoginFailures(rateKey);
    const status = db.getAdminAuthStatus(getEnvUsername(), getEnvPasscode());
    const token = createSessionToken(verified.username, sessionSecret);
    res.json({ token, username: verified.username, mode: status.mode });
  });

  app.get('/api/admin/verify', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    res.json({ authenticated: true, username: req.adminUser });
  });

  // --- CMS Routes ---
  app.get('/api/cms', (_req, res) => {
    res.json({ overrides: db.readCmsOverrides() });
  });

  app.put('/api/cms', requireAdminAuth, (req, res) => {
    const body = req.body as { content?: unknown } | undefined;
    if (!body?.content || typeof body.content !== 'object' || Array.isArray(body.content)) {
      res.status(400).json({ error: 'Invalid content payload' });
      return;
    }
    const normalized = mergeSiteContentBundle(body.content);
    db.writeCmsOverrides(normalized);
    res.json({ ok: true, overrides: normalized });
  });

  app.post('/api/cms/reset', requireAdminAuth, (_req, res) => {
    db.resetCmsOverrides();
    res.json({ ok: true, overrides: null });
  });

  // --- Admin Full Export ---
  app.get('/api/admin/export', requireAdminAuth, (_req, res) => {
    res.json(db.exportAllAdminData());
  });

  // --- Admin Portal Accounts Management ---
  app.get('/api/admin/portal-accounts', requireAdminAuth, (_req, res) => {
    res.json({ accounts: db.listPortalAccounts() });
  });

  app.get('/api/admin/portal-accounts/:id', requireAdminAuth, (req, res) => {
    const account = db.getPortalAccountById(String(req.params.id ?? ''));
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json({ account });
  });

  app.get('/api/admin/portal-accounts/:id/export', requireAdminAuth, (req, res) => {
    const exported = db.exportPortalAccountData(String(req.params.id ?? ''));
    if (!exported) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json(exported);
  });

  app.post('/api/admin/portal-accounts', requireAdminAuth, (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = db.createPortalAccount({
      username: typeof body.username === 'string' ? body.username : '',
      password: typeof body.password === 'string' ? body.password : '',
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      tierCode:
        body.tierCode === 'CORE' || body.tierCode === 'ELITE' || body.tierCode === 'PRO'
          ? body.tierCode
          : undefined,
      targetCalories: typeof body.targetCalories === 'number' ? body.targetCalories : undefined,
      proteinGrams: typeof body.proteinGrams === 'number' ? body.proteinGrams : undefined,
      carbsGrams: typeof body.carbsGrams === 'number' ? body.carbsGrams : undefined,
      fatsGrams: typeof body.fatsGrams === 'number' ? body.fatsGrams : undefined,
      splitTitle: typeof body.splitTitle === 'string' ? body.splitTitle : undefined,
      active: typeof body.active === 'boolean' ? body.active : true,
      coachNotes: typeof body.coachNotes === 'string' ? body.coachNotes : undefined,
      initialWeightKg: typeof body.initialWeightKg === 'number' ? body.initialWeightKg : undefined,
    });

    if (result.ok === false) {
      if (result.code === 'DUPLICATE_USERNAME') {
        res.status(409).json({ error: 'Username already exists' });
        return;
      }
      res
        .status(400)
        .json({ error: 'Valid username (min 3 chars) and password (min 3 chars) are required' });
      return;
    }

    res.status(201).json({ account: result.account });
  });

  app.put('/api/admin/portal-accounts/:id', requireAdminAuth, (req, res) => {
    const accountId = String(req.params.id ?? '');
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = db.updatePortalAccount(accountId, {
      username: typeof body.username === 'string' ? body.username : undefined,
      password: typeof body.password === 'string' ? body.password : undefined,
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      tierCode:
        body.tierCode === 'CORE' || body.tierCode === 'ELITE' || body.tierCode === 'PRO'
          ? body.tierCode
          : undefined,
      targetCalories: typeof body.targetCalories === 'number' ? body.targetCalories : undefined,
      proteinGrams: typeof body.proteinGrams === 'number' ? body.proteinGrams : undefined,
      carbsGrams: typeof body.carbsGrams === 'number' ? body.carbsGrams : undefined,
      fatsGrams: typeof body.fatsGrams === 'number' ? body.fatsGrams : undefined,
      splitTitle: typeof body.splitTitle === 'string' ? body.splitTitle : undefined,
      active: typeof body.active === 'boolean' ? body.active : undefined,
      coachNotes: typeof body.coachNotes === 'string' ? body.coachNotes : undefined,
      weeklyGoals: Array.isArray(body.weeklyGoals)
        ? (body.weeklyGoals as PortalWeeklyGoal[])
        : undefined,
      workoutDays: Array.isArray(body.workoutDays)
        ? (body.workoutDays as PortalWorkoutDay[])
        : undefined,
      nutritionPlan:
        body.nutritionPlan && typeof body.nutritionPlan === 'object'
          ? (body.nutritionPlan as PortalNutritionPlan)
          : undefined,
      supplements: Array.isArray(body.supplements)
        ? (body.supplements as PortalSupplementItem[])
        : undefined,
      completedExerciseIds: Array.isArray(body.completedExerciseIds)
        ? (body.completedExerciseIds as string[])
        : undefined,
    });

    if (result.ok === false) {
      if (result.code === 'NOT_FOUND') {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      if (result.code === 'DUPLICATE_USERNAME') {
        res.status(409).json({ error: 'Username already exists' });
        return;
      }
      res.status(400).json({ error: 'Invalid account credentials or parameters' });
      return;
    }

    res.json({ account: result.account });
  });

  app.delete('/api/admin/portal-accounts/:id', requireAdminAuth, (req, res) => {
    const accountId = String(req.params.id ?? '');
    const deleted = db.deletePortalAccount(accountId);
    if (!deleted) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json({ ok: true });
  });

  // Admin: Add/Delete 16-Week History Records for any athlete
  app.post('/api/admin/portal-accounts/:id/weeks', requireAdminAuth, (req, res) => {
    const accountId = String(req.params.id ?? '');
    const body = (req.body ?? {}) as Record<string, unknown>;
    const weightKg = Number(body.weightKg);
    if (!Number.isFinite(weightKg) || weightKg < 35 || weightKg > 250) {
      res.status(400).json({ error: 'Valid weightKg (35-250) is required' });
      return;
    }
    const result = db.addPortalWeekRecord(accountId, {
      startDateIso: typeof body.startDateIso === 'string' ? body.startDateIso : undefined,
      endDateIso: typeof body.endDateIso === 'string' ? body.endDateIso : undefined,
      weightKg,
      adherencePct: typeof body.adherencePct === 'number' ? body.adherencePct : undefined,
      workoutCompletionPct:
        typeof body.workoutCompletionPct === 'number' ? body.workoutCompletionPct : undefined,
      goalsSummary: typeof body.goalsSummary === 'string' ? body.goalsSummary : undefined,
      coachNotes: typeof body.coachNotes === 'string' ? body.coachNotes : undefined,
      athleteNotes: typeof body.athleteNotes === 'string' ? body.athleteNotes : undefined,
    });
    if (!result) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.status(201).json(result);
  });

  app.delete('/api/admin/portal-accounts/:id/weeks/:weekId', requireAdminAuth, (req, res) => {
    const accountId = String(req.params.id ?? '');
    const weekId = String(req.params.weekId ?? '');
    const account = db.deletePortalWeekRecord(accountId, weekId);
    if (!account) {
      res.status(404).json({ error: 'Account or week record not found' });
      return;
    }
    res.json({ account });
  });

  // Admin: Chat History & Send to specific athlete room
  app.get('/api/admin/portal-accounts/:id/chat', requireAdminAuth, (req, res) => {
    const accountId = String(req.params.id ?? '');
    const account = db.getPortalAccountById(accountId);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json({ messages: db.listChatMessages(accountId, 200) });
  });

  app.post(
    '/api/admin/portal-accounts/:id/chat',
    requireAdminAuth,
    (req: AuthenticatedRequest, res) => {
      const accountId = String(req.params.id ?? '');
      const body = (req.body ?? {}) as { body?: unknown };
      const text = typeof body.body === 'string' ? body.body.trim() : '';
      if (!text) {
        res.status(400).json({ error: 'Message body is required' });
        return;
      }
      const message = db.addChatMessage(accountId, 'admin', req.adminUser || 'Coach', text);
      if (!message) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      broadcastToAccountRoom(accountId, { type: 'chat:message', message });
      res.status(201).json({ message });
    }
  );

  // --- Client Portal Auth & Endpoints (no self-registration) ---
  app.post('/api/portal/login', (req, res) => {
    const rateKey = getClientIpKey(req, 'portal');
    if (isLoginThrottled(rateKey)) {
      res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
      return;
    }

    const body = req.body as { username?: unknown; password?: unknown } | undefined;
    const username = typeof body?.username === 'string' ? body.username : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const verified = db.verifyPortalCredentials(username, password);
    if (verified.ok === false) {
      recordLoginFailure(rateKey);
      if (verified.code === 'ACCOUNT_DISABLED') {
        res.status(403).json({ error: 'Account is currently disabled' });
        return;
      }
      res.status(401).json({ error: 'Invalid portal username or password' });
      return;
    }

    clearLoginFailures(rateKey);
    const token = createSessionToken(verified.account.username, sessionSecret, {
      role: 'portal',
      accountId: verified.account.id,
      ttlMs: 1000 * 60 * 60 * 12,
    });
    res.json({ token, account: verified.account });
  });

  app.get('/api/portal/me', requirePortalAuth, (req: AuthenticatedRequest, res) => {
    const account = req.portalAccountId ? db.getPortalAccountById(req.portalAccountId) : null;
    if (!account) {
      res.status(401).json({ error: 'Account not found' });
      return;
    }
    res.json({ account });
  });

  app.put('/api/portal/progress', requirePortalAuth, (req: AuthenticatedRequest, res) => {
    if (!req.portalAccountId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const body = (req.body ?? {}) as {
      completedExerciseIds?: unknown;
      weightCheckIns?: unknown;
      weeklyGoals?: unknown;
    };
    const updated = db.updatePortalAccountProgress(
      req.portalAccountId,
      body.completedExerciseIds,
      body.weightCheckIns,
      body.weeklyGoals
    );
    if (!updated) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json({ ok: true, account: updated });
  });

  app.post('/api/portal/weeks', requirePortalAuth, (req: AuthenticatedRequest, res) => {
    if (!req.portalAccountId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const weightKg = Number(body.weightKg);
    if (!Number.isFinite(weightKg) || weightKg < 35 || weightKg > 250) {
      res.status(400).json({ error: 'Valid weightKg (35-250) is required' });
      return;
    }
    const result = db.addPortalWeekRecord(req.portalAccountId, {
      startDateIso: typeof body.startDateIso === 'string' ? body.startDateIso : undefined,
      weightKg,
      adherencePct: typeof body.adherencePct === 'number' ? body.adherencePct : undefined,
      goalsSummary: typeof body.goalsSummary === 'string' ? body.goalsSummary : undefined,
      athleteNotes: typeof body.athleteNotes === 'string' ? body.athleteNotes : undefined,
    });
    if (!result) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.status(201).json(result);
  });

  app.get('/api/portal/chat', requirePortalAuth, (req: AuthenticatedRequest, res) => {
    if (!req.portalAccountId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json({ messages: db.listChatMessages(req.portalAccountId, 200) });
  });

  app.post('/api/portal/chat', requirePortalAuth, (req: AuthenticatedRequest, res) => {
    if (!req.portalAccountId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const body = (req.body ?? {}) as { body?: unknown };
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (!text) {
      res.status(400).json({ error: 'Message body is required' });
      return;
    }
    const message = db.addChatMessage(
      req.portalAccountId,
      'portal',
      req.portalDisplayName || req.portalUsername || 'Athlete',
      text
    );
    if (!message) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    broadcastToAccountRoom(req.portalAccountId, { type: 'chat:message', message });
    res.status(201).json({ message });
  });

  app.get('/api/portal/export', requirePortalAuth, (req: AuthenticatedRequest, res) => {
    if (!req.portalAccountId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const exported = db.exportPortalAccountData(req.portalAccountId);
    if (!exported) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json(exported);
  });

  // Frontend mounting
  const mountMode =
    options.mountFrontend ?? (process.env.NODE_ENV === 'production' ? 'static' : 'vite');
  if (mountMode === 'static') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*splat', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else if (mountMode === 'vite') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return {
    app,
    httpServer,
    wss,
    db,
    close: async () => {
      clearInterval(heartbeatInterval);
      for (const client of wss.clients) {
        client.terminate();
      }
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
      db.close();
    },
  };
}
