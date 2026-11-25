import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { WebSocket } from 'ws';
import { createAppServer } from './appServer';

function nextJsonMessage(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WS message timeout')), 4000);
    ws.once('message', (raw) => {
      clearTimeout(timer);
      resolve(JSON.parse(raw.toString('utf8')) as Record<string, unknown>);
    });
  });
}

test('Full HTTP + WebSocket end-to-end: auth gates, full account editing, Week 17 eviction, room-isolated real-time chat, and exports', async () => {
  const srv = await createAppServer({
    dbPath: ':memory:',
    legacyDataDir: '',
    sessionSecret: crypto.randomBytes(32),
    envUsername: 'coach_admin',
    envPasscode: 'SuperPass#2026',
    mountFrontend: 'none',
  });

  await new Promise<void>((resolve) => srv.httpServer.listen(0, '127.0.0.1', () => resolve()));
  const address = srv.httpServer.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const wsBaseUrl = `ws://127.0.0.1:${address.port}/ws/chat`;

  try {
    // 1. Unauthenticated requests rejected
    const unauthAdmin = await fetch(`${baseUrl}/api/admin/portal-accounts`);
    assert.equal(unauthAdmin.status, 401);
    const unauthPortal = await fetch(`${baseUrl}/api/portal/me`);
    assert.equal(unauthPortal.status, 401);

    // 2. Admin sign-in
    const adminLoginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'coach_admin', password: 'SuperPass#2026' }),
    });
    assert.equal(adminLoginRes.status, 200);
    const { token: adminToken } = (await adminLoginRes.json()) as { token: string };

    // 3. Create Athlete A and Athlete B
    const createA = await fetch(`${baseUrl}/api/admin/portal-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: 'athlete_a',
        password: 'sDf',
        displayName: 'خالد الحربي',
        tierCode: 'ELITE',
        initialWeightKg: 90,
      }),
    });
    assert.equal(createA.status, 201);
    const { account: accountA } = (await createA.json()) as { account: { id: string } };

    const createB = await fetch(`${baseUrl}/api/admin/portal-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: 'athlete_b',
        password: 'PassB',
        displayName: 'فهد السبيعي',
      }),
    });
    assert.equal(createB.status, 201);
    const { account: accountB } = (await createB.json()) as { account: { id: string } };

    // 4. Admin updates Athlete A full details (goals, workouts, nutrition, supplements)
    const updateARes = await fetch(`${baseUrl}/api/admin/portal-accounts/${accountA.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        coachNotes: 'خطة مخصصة كاملة للأسبوع الأول',
        supplements: [
          {
            id: 'sup-custom',
            name: 'سيترولين ماليت',
            dosage: '6 جم',
            timing: 'قبل التمرين بـ 30 دقيقة',
            purpose: 'ضخ الدم والأداء',
            notes: '',
          },
        ],
      }),
    });
    assert.equal(updateARes.status, 200);

    // 5. Athlete A & Athlete B log in
    const loginARes = await fetch(`${baseUrl}/api/portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'athlete_a', password: 'sDf' }),
    });
    assert.equal(loginARes.status, 200);
    const { token: tokenA } = (await loginARes.json()) as { token: string };

    const loginBRes = await fetch(`${baseUrl}/api/portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'athlete_b', password: 'PassB' }),
    });
    assert.equal(loginBRes.status, 200);
    const { token: tokenB } = (await loginBRes.json()) as { token: string };

    // 6. Athlete A logs weeks 2..17 -> Week 1 evicted on Week 17
    for (let w = 2; w <= 16; w++) {
      const r = await fetch(`${baseUrl}/api/portal/weeks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ weightKg: Number((90 - w * 0.4).toFixed(1)), adherencePct: 95 }),
      });
      assert.equal(r.status, 201);
    }

    const r17 = await fetch(`${baseUrl}/api/portal/weeks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        weightKg: 82.8,
        adherencePct: 99,
        athleteNotes: 'الأسبوع السابع عشر',
      }),
    });
    assert.equal(r17.status, 201);
    const payload17 = (await r17.json()) as {
      account: { weeklyRecords: { weekNumber: number }[] };
      evictedWeekNumbers: number[];
    };
    assert.deepEqual(payload17.evictedWeekNumbers, [1]);
    assert.equal(payload17.account.weeklyRecords.length, 16);
    assert.equal(payload17.account.weeklyRecords[0].weekNumber, 2);
    assert.equal(payload17.account.weeklyRecords[15].weekNumber, 17);

    // 7. Real-Time WebSocket Chat + Room Isolation
    const wsAdmin = new WebSocket(`${wsBaseUrl}?token=${encodeURIComponent(adminToken)}&accountId=${accountA.id}`);
    const wsA = new WebSocket(`${wsBaseUrl}?token=${encodeURIComponent(tokenA)}`);
    // Even if Athlete B passes accountA.id in query param, server locks wsB strictly to accountB.id
    const wsB = new WebSocket(`${wsBaseUrl}?token=${encodeURIComponent(tokenB)}&accountId=${accountA.id}`);

    const [histAdmin, histA, histB] = await Promise.all([
      nextJsonMessage(wsAdmin),
      nextJsonMessage(wsA),
      nextJsonMessage(wsB),
    ]);
    assert.equal(histAdmin.type, 'chat:history');
    assert.equal(histA.type, 'chat:history');
    assert.equal(histB.accountId, accountB.id); // Strict isolation enforced!

    const msgFromAdminPromise = nextJsonMessage(wsA);
    wsAdmin.send(
      JSON.stringify({
        type: 'chat:send',
        accountId: accountA.id,
        body: 'أهلاً خالد، تم تحديث مكملاتك',
      })
    );
    const receivedByA = await msgFromAdminPromise;
    assert.equal(receivedByA.type, 'chat:message');
    assert.equal((receivedByA.message as { body: string }).body, 'أهلاً خالد، تم تحديث مكملاتك');

    const msgFromAPromise = nextJsonMessage(wsAdmin);
    wsA.send(JSON.stringify({ type: 'chat:send', body: 'شكراً كابتن، وصلت التحديثات!' }));
    const receivedByAdmin = await msgFromAPromise;
    assert.equal(receivedByAdmin.type, 'chat:message');
    assert.equal(
      (receivedByAdmin.message as { body: string }).body,
      'شكراً كابتن، وصلت التحديثات!'
    );

    wsAdmin.close();
    wsA.close();
    wsB.close();

    // 8. Export endpoints (Portal + Admin)
    const portalExportRes = await fetch(`${baseUrl}/api/portal/export`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(portalExportRes.status, 200);
    const portalExportText = await portalExportRes.text();
    assert.equal(portalExportText.includes('passwordHash'), false);
    assert.match(portalExportText, /سيترولين ماليت/);
    assert.match(portalExportText, /أهلاً خالد، تم تحديث مكملاتك/);

    const adminExportRes = await fetch(`${baseUrl}/api/admin/export`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminExportRes.status, 200);
    const adminExportJson = (await adminExportRes.json()) as {
      portalAccounts: unknown[];
      siteContent: unknown;
    };
    assert.equal(adminExportJson.portalAccounts.length, 2);

    // 9. Security checks: no usernameHint leak, security headers present without X-Frame-Options,
    //    CMS array rejection & normalization, and disabled portal account WS revocation
    const statusRes = await fetch(`${baseUrl}/api/admin/status`);
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(statusRes.headers.get('x-frame-options'), null);
    const statusJson = (await statusRes.json()) as Record<string, unknown>;
    assert.equal('usernameHint' in statusJson, false);

    const badCmsRes = await fetch(`${baseUrl}/api/cms`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ content: ['invalid-array'] }),
    });
    assert.equal(badCmsRes.status, 400);

    const goodCmsRes = await fetch(`${baseUrl}/api/cms`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ content: { whatsappNumber: '966501112233' } }),
    });
    assert.equal(goodCmsRes.status, 200);
    const cmsPayload = (await goodCmsRes.json()) as { overrides: { ar?: unknown; whatsappNumber?: string } };
    assert.equal(cmsPayload.overrides.whatsappNumber, '966501112233');
    assert.ok(cmsPayload.overrides.ar);

    // Disabling Athlete B revokes live WebSocket sending immediately
    const wsBLive = new WebSocket(`${wsBaseUrl}?token=${encodeURIComponent(tokenB)}`);
    await nextJsonMessage(wsBLive);
    const disableBRes = await fetch(`${baseUrl}/api/admin/portal-accounts/${accountB.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ active: false }),
    });
    assert.equal(disableBRes.status, 200);

    const closePromise = new Promise<number>((resolve) => {
      wsBLive.once('close', (code) => resolve(code));
    });
    wsBLive.send(JSON.stringify({ type: 'chat:send', body: 'Should be blocked' }));
    const closeCode = await closePromise;
    assert.equal(closeCode, 4403);
  } finally {
    await srv.close();
  }
});

test('Reverse proxy X-Forwarded-For isolates login rate-limit buckets per visitor IP', async () => {
  const srv = await createAppServer({
    dbPath: ':memory:',
    legacyDataDir: '',
    sessionSecret: crypto.randomBytes(32),
    envUsername: 'coach_admin',
    envPasscode: 'SuperPass#2026',
    mountFrontend: 'none',
  });

  await new Promise<void>((resolve) => srv.httpServer.listen(0, '127.0.0.1', () => resolve()));
  const address = srv.httpServer.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // Exhaust bucket for visitor 203.0.113.10
    for (let i = 0; i < 25; i++) {
      const r = await fetch(`${baseUrl}/api/portal/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '203.0.113.10',
        },
        body: JSON.stringify({ username: 'nobody', password: 'wrong' }),
      });
      assert.equal(r.status, 401);
    }

    const throttled = await fetch(`${baseUrl}/api/portal/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.10',
      },
      body: JSON.stringify({ username: 'nobody', password: 'wrong' }),
    });
    assert.equal(throttled.status, 429);

    // Different visitor IP is unaffected
    const otherVisitor = await fetch(`${baseUrl}/api/portal/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.99',
      },
      body: JSON.stringify({ username: 'nobody', password: 'wrong' }),
    });
    assert.equal(otherVisitor.status, 401);
  } finally {
    await srv.close();
  }
});
