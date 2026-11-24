import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface StoredAdminCredential {
  username: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

export type AdminAuthMode = 'env' | 'claimed' | 'setup';

export interface AdminAuthStatus {
  mode: AdminAuthMode;
  configured: boolean;
  usernameHint?: string;
}

export function resolveConfinedPath(baseDir: string, filename: string): string {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, filename);
  if (
    resolvedTarget !== resolvedBase &&
    !resolvedTarget.startsWith(resolvedBase + path.sep)
  ) {
    throw new Error('Path traversal rejected');
  }
  return resolvedTarget;
}

export function hashPassword(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64);
  return {
    salt,
    hash: derived.toString('hex'),
  };
}

export function verifyPassword(
  password: string,
  salt: string,
  expectedHashHex: string
): boolean {
  if (!password || !salt || !expectedHashHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function safeEqualStrings(a: string, b: string): boolean {
  const bufA = crypto.createHash('sha256').update(a).digest();
  const bufB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

export type SessionRole = 'admin' | 'portal';

export interface CreateSessionOptions {
  role?: SessionRole;
  accountId?: string;
  ttlMs?: number;
}

export interface VerifiedSessionToken {
  sub: string;
  exp: number;
  role: SessionRole;
  accountId?: string;
}

export function createSessionToken(
  username: string,
  secret: Buffer,
  ttlOrOptions: number | CreateSessionOptions = 1000 * 60 * 60 * 8
): string {
  const opts: CreateSessionOptions =
    typeof ttlOrOptions === 'number' ? { ttlMs: ttlOrOptions } : ttlOrOptions;
  const ttlMs = opts.ttlMs ?? 1000 * 60 * 60 * 8;
  const role: SessionRole = opts.role === 'portal' ? 'portal' : 'admin';

  const payloadObj: Record<string, unknown> = {
    sub: username,
    role,
    exp: Date.now() + ttlMs,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  if (opts.accountId) {
    payloadObj.aid = opts.accountId;
  }

  const payload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(
  token: string,
  secret: Buffer
): VerifiedSessionToken | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: unknown;
      exp?: unknown;
      role?: unknown;
      aid?: unknown;
    };
    if (
      typeof parsed.sub !== 'string' ||
      typeof parsed.exp !== 'number' ||
      Date.now() > parsed.exp
    ) {
      return null;
    }
    const role: SessionRole = parsed.role === 'portal' ? 'portal' : 'admin';
    if (role === 'portal' && typeof parsed.aid !== 'string') {
      return null;
    }
    return {
      sub: parsed.sub,
      exp: parsed.exp,
      role,
      accountId: typeof parsed.aid === 'string' ? parsed.aid : undefined,
    };
  } catch {
    return null;
  }
}

export function readStoredCredential(authFilePath: string): StoredAdminCredential | null {
  try {
    if (!fs.existsSync(authFilePath)) return null;
    const raw = fs.readFileSync(authFilePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoredAdminCredential>;
    if (
      typeof parsed.username === 'string' &&
      typeof parsed.salt === 'string' &&
      typeof parsed.passwordHash === 'string'
    ) {
      return {
        username: parsed.username,
        salt: parsed.salt,
        passwordHash: parsed.passwordHash,
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function getAuthStatus(
  authFilePath: string,
  _envUsername?: string,
  envPasscode?: string
): AdminAuthStatus {
  if (envPasscode && envPasscode.trim().length > 0) {
    return {
      mode: 'env',
      configured: true,
    };
  }
  const stored = readStoredCredential(authFilePath);
  if (stored) {
    return {
      mode: 'claimed',
      configured: true,
    };
  }
  return {
    mode: 'setup',
    configured: false,
  };
}

export function claimAdminCredentials(
  authFilePath: string,
  username: string,
  password: string,
  envPasscode?: string
): { ok: true; username: string } | { ok: false; code: 'ALREADY_CONFIGURED' | 'INVALID_INPUT' } {
  const trimmedUser = username.trim();
  if (trimmedUser.length < 3 || trimmedUser.length > 80 || password.length < 8) {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  if ((envPasscode && envPasscode.trim().length > 0) || readStoredCredential(authFilePath)) {
    return { ok: false, code: 'ALREADY_CONFIGURED' };
  }

  fs.mkdirSync(path.dirname(authFilePath), { recursive: true });
  const { salt, hash } = hashPassword(password);
  const record: StoredAdminCredential = {
    username: trimmedUser,
    salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(authFilePath, JSON.stringify(record, null, 2), { flag: 'wx', mode: 0o600 });
    return { ok: true, username: trimmedUser };
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'EEXIST') {
      return { ok: false, code: 'ALREADY_CONFIGURED' };
    }
    throw err;
  }
}

export function verifyAdminCredentials(
  authFilePath: string,
  username: string,
  password: string,
  envUsername?: string,
  envPasscode?: string
): { ok: true; username: string } | { ok: false } {
  const trimmedUser = username.trim();
  if (!trimmedUser || !password) {
    return { ok: false };
  }

  // Env passcode overrides claimed fallback hash
  if (envPasscode && envPasscode.trim().length > 0) {
    const expectedPass = envPasscode.trim();
    const expectedUser = envUsername && envUsername.trim().length > 0 ? envUsername.trim() : null;
    const passMatches = safeEqualStrings(password, expectedPass);
    const userMatches = expectedUser
      ? safeEqualStrings(trimmedUser.toLowerCase(), expectedUser.toLowerCase())
      : trimmedUser.length >= 3;
    if (passMatches && userMatches) {
      return { ok: true, username: trimmedUser };
    }
    return { ok: false };
  }

  const stored = readStoredCredential(authFilePath);
  if (!stored) {
    return { ok: false };
  }

  const userMatches = safeEqualStrings(trimmedUser.toLowerCase(), stored.username.toLowerCase());
  const passMatches = verifyPassword(password, stored.salt, stored.passwordHash);
  if (userMatches && passMatches) {
    return { ok: true, username: stored.username };
  }
  return { ok: false };
}

export type PortalTierCode = 'CORE' | 'PRO' | 'ELITE';

export interface PortalWeightEntry {
  week: string;
  weightKg: number;
  note: string;
}

export interface PortalAccountRecord {
  id: string;
  username: string;
  displayName: string;
  tierCode: PortalTierCode;
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  splitTitle: string;
  active: boolean;
  completedExerciseIds: string[];
  weightCheckIns: PortalWeightEntry[];
  salt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export type PortalAccountPublic = Omit<PortalAccountRecord, 'salt' | 'passwordHash'>;

export interface CreatePortalAccountInput {
  username: string;
  password: string;
  displayName?: string;
  tierCode?: PortalTierCode;
  targetCalories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatsGrams?: number;
  splitTitle?: string;
  active?: boolean;
}

export interface UpdatePortalAccountInput {
  username?: string;
  password?: string;
  displayName?: string;
  tierCode?: PortalTierCode;
  targetCalories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatsGrams?: number;
  splitTitle?: string;
  active?: boolean;
}

function normalizeTierCode(val: unknown): PortalTierCode {
  return val === 'CORE' || val === 'ELITE' ? val : 'PRO';
}

function clampMetric(val: unknown, fallback: number, min: number, max: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.round(Math.min(max, Math.max(min, num)));
}

function normalizeWeightCheckIns(val: unknown): PortalWeightEntry[] {
  if (!Array.isArray(val) || val.length === 0) {
    return [{ week: 'الأسبوع 1', weightKg: 82, note: 'الوزن المبدئي' }];
  }
  const cleaned = val
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      week:
        typeof item.week === 'string' && item.week.trim().length > 0
          ? item.week.trim().slice(0, 40)
          : `Week ${idx + 1}`,
      weightKg: Number(
        Math.min(250, Math.max(35, Number(item.weightKg) || 82)).toFixed(1)
      ),
      note: typeof item.note === 'string' ? item.note.trim().slice(0, 140) : '',
    }));
  return cleaned.length > 0
    ? cleaned.slice(0, 60)
    : [{ week: 'الأسبوع 1', weightKg: 82, note: 'الوزن المبدئي' }];
}

export function sanitizePortalAccount(record: PortalAccountRecord): PortalAccountPublic {
  const { salt: _salt, passwordHash: _hash, ...rest } = record;
  return rest;
}

export function readPortalAccounts(filePath: string): PortalAccountRecord[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PortalAccountRecord =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.username === 'string' &&
            typeof item.salt === 'string' &&
            typeof item.passwordHash === 'string'
        )
    );
  } catch {
    return [];
  }
}

export function writePortalAccounts(filePath: string, accounts: PortalAccountRecord[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2), { mode: 0o600 });
}

export function listPortalAccounts(filePath: string): PortalAccountPublic[] {
  return readPortalAccounts(filePath).map(sanitizePortalAccount);
}

export function getPortalAccountById(
  filePath: string,
  accountId: string
): PortalAccountPublic | null {
  const found = readPortalAccounts(filePath).find((acc) => acc.id === accountId);
  return found ? sanitizePortalAccount(found) : null;
}

export function createPortalAccount(
  filePath: string,
  input: CreatePortalAccountInput
):
  | { ok: true; account: PortalAccountPublic }
  | { ok: false; code: 'INVALID_INPUT' | 'DUPLICATE_USERNAME' } {
  const trimmedUsername = typeof input.username === 'string' ? input.username.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (
    trimmedUsername.length < 3 ||
    trimmedUsername.length > 60 ||
    password.length < 3 ||
    password.length > 128
  ) {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  const accounts = readPortalAccounts(filePath);
  const exists = accounts.some(
    (acc) => acc.username.toLowerCase() === trimmedUsername.toLowerCase()
  );
  if (exists) {
    return { ok: false, code: 'DUPLICATE_USERNAME' };
  }

  const now = new Date().toISOString();
  const { salt, hash } = hashPassword(password);
  const displayName =
    typeof input.displayName === 'string' && input.displayName.trim().length > 0
      ? input.displayName.trim().slice(0, 80)
      : trimmedUsername;

  const newRecord: PortalAccountRecord = {
    id: `portal_${crypto.randomUUID()}`,
    username: trimmedUsername,
    displayName,
    tierCode: normalizeTierCode(input.tierCode),
    targetCalories: clampMetric(input.targetCalories, 2240, 1000, 6000),
    proteinGrams: clampMetric(input.proteinGrams, 190, 40, 400),
    carbsGrams: clampMetric(input.carbsGrams, 230, 20, 800),
    fatsGrams: clampMetric(input.fatsGrams, 62, 20, 250),
    splitTitle:
      typeof input.splitTitle === 'string' && input.splitTitle.trim().length > 0
        ? input.splitTitle.trim().slice(0, 100)
        : 'علوي / سفلي متوازن (4 أيام)',
    active: input.active !== false,
    completedExerciseIds: [],
    weightCheckIns: [{ week: 'الأسبوع 1', weightKg: 82, note: 'الوزن المبدئي' }],
    salt,
    passwordHash: hash,
    createdAt: now,
    updatedAt: now,
  };

  accounts.push(newRecord);
  writePortalAccounts(filePath, accounts);
  return { ok: true, account: sanitizePortalAccount(newRecord) };
}

export function updatePortalAccount(
  filePath: string,
  accountId: string,
  input: UpdatePortalAccountInput
):
  | { ok: true; account: PortalAccountPublic }
  | { ok: false; code: 'NOT_FOUND' | 'INVALID_INPUT' | 'DUPLICATE_USERNAME' } {
  const accounts = readPortalAccounts(filePath);
  const idx = accounts.findIndex((acc) => acc.id === accountId);
  if (idx === -1) {
    return { ok: false, code: 'NOT_FOUND' };
  }

  const existing = accounts[idx];
  const nextUsername =
    typeof input.username === 'string' ? input.username.trim() : existing.username;
  if (nextUsername.length < 3 || nextUsername.length > 60) {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  const duplicate = accounts.some(
    (acc) => acc.id !== accountId && acc.username.toLowerCase() === nextUsername.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, code: 'DUPLICATE_USERNAME' };
  }

  let nextSalt = existing.salt;
  let nextHash = existing.passwordHash;
  if (typeof input.password === 'string' && input.password.length > 0) {
    if (input.password.length < 3 || input.password.length > 128) {
      return { ok: false, code: 'INVALID_INPUT' };
    }
    const updatedCreds = hashPassword(input.password);
    nextSalt = updatedCreds.salt;
    nextHash = updatedCreds.hash;
  }

  const updated: PortalAccountRecord = {
    ...existing,
    username: nextUsername,
    displayName:
      typeof input.displayName === 'string' && input.displayName.trim().length > 0
        ? input.displayName.trim().slice(0, 80)
        : existing.displayName,
    tierCode: input.tierCode ? normalizeTierCode(input.tierCode) : existing.tierCode,
    targetCalories:
      input.targetCalories !== undefined
        ? clampMetric(input.targetCalories, existing.targetCalories, 1000, 6000)
        : existing.targetCalories,
    proteinGrams:
      input.proteinGrams !== undefined
        ? clampMetric(input.proteinGrams, existing.proteinGrams, 40, 400)
        : existing.proteinGrams,
    carbsGrams:
      input.carbsGrams !== undefined
        ? clampMetric(input.carbsGrams, existing.carbsGrams, 20, 800)
        : existing.carbsGrams,
    fatsGrams:
      input.fatsGrams !== undefined
        ? clampMetric(input.fatsGrams, existing.fatsGrams, 20, 250)
        : existing.fatsGrams,
    splitTitle:
      typeof input.splitTitle === 'string' && input.splitTitle.trim().length > 0
        ? input.splitTitle.trim().slice(0, 100)
        : existing.splitTitle,
    active: input.active !== undefined ? Boolean(input.active) : existing.active,
    salt: nextSalt,
    passwordHash: nextHash,
    updatedAt: new Date().toISOString(),
  };

  accounts[idx] = updated;
  writePortalAccounts(filePath, accounts);
  return { ok: true, account: sanitizePortalAccount(updated) };
}

export function deletePortalAccount(filePath: string, accountId: string): boolean {
  const accounts = readPortalAccounts(filePath);
  const filtered = accounts.filter((acc) => acc.id !== accountId);
  if (filtered.length === accounts.length) {
    return false;
  }
  writePortalAccounts(filePath, filtered);
  return true;
}

export function verifyPortalCredentials(
  filePath: string,
  username: string,
  password: string
):
  | { ok: true; account: PortalAccountPublic }
  | { ok: false; code: 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED' } {
  const trimmedUser = typeof username === 'string' ? username.trim() : '';
  if (!trimmedUser || !password) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }

  const accounts = readPortalAccounts(filePath);
  const candidate = accounts.find((acc) =>
    safeEqualStrings(acc.username.toLowerCase(), trimmedUser.toLowerCase())
  );
  if (!candidate) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }

  const passMatches = verifyPassword(password, candidate.salt, candidate.passwordHash);
  if (!passMatches) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }

  if (candidate.active === false) {
    return { ok: false, code: 'ACCOUNT_DISABLED' };
  }

  return { ok: true, account: sanitizePortalAccount(candidate) };
}

export function updatePortalAccountProgress(
  filePath: string,
  accountId: string,
  completedExerciseIds?: unknown,
  weightCheckIns?: unknown
): PortalAccountPublic | null {
  const accounts = readPortalAccounts(filePath);
  const idx = accounts.findIndex((acc) => acc.id === accountId);
  if (idx === -1) return null;

  const existing = accounts[idx];
  const nextExercises = Array.isArray(completedExerciseIds)
    ? completedExerciseIds
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .slice(0, 100)
    : existing.completedExerciseIds;
  const nextWeights =
    weightCheckIns !== undefined
      ? normalizeWeightCheckIns(weightCheckIns)
      : existing.weightCheckIns;

  const updated: PortalAccountRecord = {
    ...existing,
    completedExerciseIds: nextExercises,
    weightCheckIns: nextWeights,
    updatedAt: new Date().toISOString(),
  };
  accounts[idx] = updated;
  writePortalAccounts(filePath, accounts);
  return sanitizePortalAccount(updated);
}

export function readCmsOverrides(contentFilePath: string): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(contentFilePath)) return null;
    const raw = fs.readFileSync(contentFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function writeCmsOverrides(contentFilePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(contentFilePath), { recursive: true });
  fs.writeFileSync(contentFilePath, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function resetCmsOverrides(contentFilePath: string): void {
  if (fs.existsSync(contentFilePath)) {
    fs.unlinkSync(contentFilePath);
  }
}
