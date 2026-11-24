import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  buildSanitizedAdminFullExport,
  buildSanitizedPortalExport,
  computeNextWeekDates,
  createDefaultNutritionPlan,
  createDefaultSupplements,
  createDefaultWeeklyGoals,
  createDefaultWorkoutDaysFromCoaching,
  createInitialWeekRecord,
  formatDualDateRange,
  MAX_PORTAL_WEEKS,
  type PortalChatMessage,
  type PortalMealItem,
  type PortalNutritionPlan,
  type PortalSupplementItem,
  type PortalWeekRecord,
  type PortalWeeklyGoal,
  type PortalWorkoutDay,
} from '../src/utils/portalPlanning.ts';
import {
  getDefaultSiteContentBundle,
  mergeSiteContentBundle,
  type PortalAccountPublic,
  type PortalTierCode,
  type PortalWeightEntry,
} from '../src/utils/cmsSchema.ts';
import {
  hashPassword,
  readCmsOverrides,
  readPortalAccounts,
  readStoredCredential,
  safeEqualStrings,
  verifyPassword,
  type AdminAuthStatus,
  type StoredAdminCredential,
} from './authAndStore.ts';

export interface CreatePortalAccountDbInput {
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
  coachNotes?: string;
  weeklyGoals?: PortalWeeklyGoal[];
  workoutDays?: PortalWorkoutDay[];
  nutritionPlan?: PortalNutritionPlan;
  supplements?: PortalSupplementItem[];
  initialWeightKg?: number;
}

export interface UpdatePortalAccountDbInput {
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
  coachNotes?: string;
  weeklyGoals?: PortalWeeklyGoal[];
  workoutDays?: PortalWorkoutDay[];
  nutritionPlan?: PortalNutritionPlan;
  supplements?: PortalSupplementItem[];
  completedExerciseIds?: string[];
}

export interface AddPortalWeekInput {
  startDateIso?: string;
  endDateIso?: string;
  weightKg: number;
  adherencePct?: number;
  workoutCompletionPct?: number;
  completedExercisesCount?: number;
  goalsSummary?: string;
  coachNotes?: string;
  athleteNotes?: string;
}

function clampInt(val: unknown, fallback: number, min: number, max: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.round(Math.min(max, Math.max(min, num)));
}

function clampFloat(val: unknown, fallback: number, min: number, max: number, decimals = 1): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  const clamped = Math.min(max, Math.max(min, num));
  return Number(clamped.toFixed(decimals));
}

function normalizeTier(val: unknown): PortalTierCode {
  return val === 'CORE' || val === 'ELITE' ? val : 'PRO';
}

function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeWorkoutDays(val: unknown): PortalWorkoutDay[] {
  if (!Array.isArray(val) || val.length === 0) {
    return createDefaultWorkoutDaysFromCoaching('ar');
  }
  const days: PortalWorkoutDay[] = val
    .filter((d): d is Record<string, unknown> => Boolean(d && typeof d === 'object'))
    .slice(0, 14)
    .map((d, dIdx) => {
      const exercisesRaw = Array.isArray(d.exercises) ? d.exercises : [];
      const exercises = exercisesRaw
        .filter((ex): ex is Record<string, unknown> => Boolean(ex && typeof ex === 'object'))
        .slice(0, 30)
        .map((ex, eIdx) => ({
          id:
            typeof ex.id === 'string' && ex.id.trim()
              ? ex.id.trim().slice(0, 60)
              : `ex-d${dIdx + 1}-${eIdx + 1}-${crypto.randomUUID().slice(0, 6)}`,
          name:
            typeof ex.name === 'string' && ex.name.trim()
              ? ex.name.trim().slice(0, 140)
              : `Exercise ${eIdx + 1}`,
          sets: clampInt(ex.sets, 3, 1, 20),
          reps:
            typeof ex.reps === 'string' && ex.reps.trim()
              ? ex.reps.trim().slice(0, 40)
              : '8 - 12',
          restSeconds: clampInt(ex.restSeconds, 90, 15, 600),
          weightKg:
            typeof ex.weightKg === 'string' ? ex.weightKg.trim().slice(0, 40) : '',
          targetRpe:
            typeof ex.targetRpe === 'string' && ex.targetRpe.trim()
              ? ex.targetRpe.trim().slice(0, 30)
              : 'RPE 8',
          tempo:
            typeof ex.tempo === 'string' && ex.tempo.trim()
              ? ex.tempo.trim().slice(0, 30)
              : '3-1-1-0',
          notes: typeof ex.notes === 'string' ? ex.notes.trim().slice(0, 300) : '',
          videoCue: typeof ex.videoCue === 'string' ? ex.videoCue.trim().slice(0, 300) : '',
        }));

      return {
        id:
          typeof d.id === 'string' && d.id.trim()
            ? d.id.trim().slice(0, 60)
            : `day-${dIdx + 1}`,
        label:
          typeof d.label === 'string' && d.label.trim()
            ? d.label.trim().slice(0, 60)
            : `اليوم ${dIdx + 1}`,
        focus:
          typeof d.focus === 'string' && d.focus.trim()
            ? d.focus.trim().slice(0, 140)
            : 'تدريب مقاومة',
        durationMinutes: clampInt(d.durationMinutes, 50, 10, 240),
        warmupNote:
          typeof d.warmupNote === 'string' ? d.warmupNote.trim().slice(0, 300) : '',
        exercises,
      };
    });

  return days.length > 0 ? days : createDefaultWorkoutDaysFromCoaching('ar');
}

function normalizeWeeklyGoals(val: unknown): PortalWeeklyGoal[] {
  if (!Array.isArray(val)) return createDefaultWeeklyGoals('ar');
  return val
    .filter((g): g is Record<string, unknown> => Boolean(g && typeof g === 'object'))
    .slice(0, 24)
    .map((g, idx) => ({
      id:
        typeof g.id === 'string' && g.id.trim()
          ? g.id.trim().slice(0, 60)
          : `goal-${idx + 1}-${crypto.randomUUID().slice(0, 5)}`,
      title:
        typeof g.title === 'string' && g.title.trim()
          ? g.title.trim().slice(0, 180)
          : `Goal ${idx + 1}`,
      targetMetric:
        typeof g.targetMetric === 'string' ? g.targetMetric.trim().slice(0, 80) : '',
      currentProgress:
        typeof g.currentProgress === 'string' ? g.currentProgress.trim().slice(0, 80) : '',
      category:
        g.category === 'training' ||
        g.category === 'nutrition' ||
        g.category === 'recovery' ||
        g.category === 'habit'
          ? g.category
          : 'training',
      completed: Boolean(g.completed),
    }));
}

function normalizeNutritionPlan(
  val: unknown,
  calories: number,
  protein: number,
  carbs: number,
  fats: number
): PortalNutritionPlan {
  const defaults = createDefaultNutritionPlan(calories, protein, carbs, fats, 'ar');
  if (!val || typeof val !== 'object') return defaults;
  const src = val as Record<string, unknown>;
  const mealsRaw = Array.isArray(src.meals) ? src.meals : null;
  const meals: PortalMealItem[] = mealsRaw
    ? mealsRaw
        .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
        .slice(0, 12)
        .map((m, idx) => ({
          id:
            typeof m.id === 'string' && m.id.trim()
              ? m.id.trim().slice(0, 60)
              : `meal-${idx + 1}-${crypto.randomUUID().slice(0, 5)}`,
          timeLabel:
            typeof m.timeLabel === 'string' ? m.timeLabel.trim().slice(0, 40) : '',
          title:
            typeof m.title === 'string' && m.title.trim()
              ? m.title.trim().slice(0, 120)
              : `الوجبة ${idx + 1}`,
          ingredients:
            typeof m.ingredients === 'string' ? m.ingredients.trim().slice(0, 500) : '',
          calories: clampInt(m.calories, 450, 0, 4000),
          proteinGrams: clampInt(m.proteinGrams, 35, 0, 300),
          carbsGrams: clampInt(m.carbsGrams, 45, 0, 500),
          fatsGrams: clampInt(m.fatsGrams, 15, 0, 200),
          notes: typeof m.notes === 'string' ? m.notes.trim().slice(0, 300) : '',
        }))
    : defaults.meals;

  return {
    dailyWaterLiters: clampFloat(src.dailyWaterLiters, defaults.dailyWaterLiters, 0.5, 10, 1),
    sleepHoursTarget: clampFloat(src.sleepHoursTarget, defaults.sleepHoursTarget, 4, 14, 1),
    stepsTarget: clampInt(src.stepsTarget, defaults.stepsTarget, 1000, 40000),
    mealTimingNote:
      typeof src.mealTimingNote === 'string'
        ? src.mealTimingNote.trim().slice(0, 400)
        : defaults.mealTimingNote,
    coachNutritionNotes:
      typeof src.coachNutritionNotes === 'string'
        ? src.coachNutritionNotes.trim().slice(0, 600)
        : defaults.coachNutritionNotes,
    meals,
  };
}

function normalizeSupplements(val: unknown): PortalSupplementItem[] {
  if (!Array.isArray(val)) return createDefaultSupplements('ar');
  return val
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
    .slice(0, 24)
    .map((s, idx) => ({
      id:
        typeof s.id === 'string' && s.id.trim()
          ? s.id.trim().slice(0, 60)
          : `sup-${idx + 1}-${crypto.randomUUID().slice(0, 5)}`,
      name:
        typeof s.name === 'string' && s.name.trim()
          ? s.name.trim().slice(0, 120)
          : `Supplement ${idx + 1}`,
      dosage: typeof s.dosage === 'string' ? s.dosage.trim().slice(0, 80) : '',
      timing: typeof s.timing === 'string' ? s.timing.trim().slice(0, 80) : '',
      purpose: typeof s.purpose === 'string' ? s.purpose.trim().slice(0, 200) : '',
      notes: typeof s.notes === 'string' ? s.notes.trim().slice(0, 300) : '',
    }));
}

interface RawPortalAccountRow {
  id: string;
  username: string;
  display_name: string;
  tier_code: string;
  target_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fats_grams: number;
  split_title: string;
  active: number;
  completed_exercise_ids_json: string;
  weight_check_ins_json: string;
  coach_notes: string;
  weekly_goals_json: string;
  workout_days_json: string;
  nutrition_plan_json: string;
  supplements_json: string;
  salt: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

interface RawPortalWeekRow {
  id: string;
  account_id: string;
  week_number: number;
  start_date_iso: string;
  end_date_iso: string;
  gregorian_range_ar: string;
  gregorian_range_en: string;
  hijri_range_ar: string;
  hijri_range_en: string;
  weight_kg: number;
  adherence_pct: number;
  workout_completion_pct: number;
  completed_exercises_count: number;
  goals_summary: string;
  coach_notes: string;
  athlete_notes: string;
  recorded_at: string;
}

interface RawChatRow {
  id: string;
  account_id: string;
  sender_role: string;
  sender_name: string;
  body: string;
  created_at: string;
}

function mapWeekRow(row: RawPortalWeekRow): PortalWeekRecord {
  return {
    id: row.id,
    weekNumber: row.week_number,
    startDateIso: row.start_date_iso,
    endDateIso: row.end_date_iso,
    gregorianRangeAr: row.gregorian_range_ar,
    gregorianRangeEn: row.gregorian_range_en,
    hijriRangeAr: row.hijri_range_ar,
    hijriRangeEn: row.hijri_range_en,
    weightKg: row.weight_kg,
    adherencePct: row.adherence_pct,
    workoutCompletionPct: row.workout_completion_pct,
    completedExercisesCount: row.completed_exercises_count,
    goalsSummary: row.goals_summary,
    coachNotes: row.coach_notes,
    athleteNotes: row.athlete_notes,
    recordedAt: row.recorded_at,
  };
}

function mapChatRow(row: RawChatRow): PortalChatMessage {
  return {
    id: row.id,
    accountId: row.account_id,
    senderRole: row.sender_role === 'admin' ? 'admin' : 'portal',
    senderName: row.sender_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

export class KineticDatabase {
  private readonly db: DatabaseSync;
  readonly dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS admin_credentials (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        username TEXT NOT NULL,
        salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cms_overrides (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS portal_accounts (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        display_name TEXT NOT NULL,
        tier_code TEXT NOT NULL DEFAULT 'PRO',
        target_calories INTEGER NOT NULL DEFAULT 2240,
        protein_grams INTEGER NOT NULL DEFAULT 190,
        carbs_grams INTEGER NOT NULL DEFAULT 230,
        fats_grams INTEGER NOT NULL DEFAULT 62,
        split_title TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        completed_exercise_ids_json TEXT NOT NULL DEFAULT '[]',
        weight_check_ins_json TEXT NOT NULL DEFAULT '[]',
        coach_notes TEXT NOT NULL DEFAULT '',
        weekly_goals_json TEXT NOT NULL DEFAULT '[]',
        workout_days_json TEXT NOT NULL DEFAULT '[]',
        nutrition_plan_json TEXT NOT NULL DEFAULT '{}',
        supplements_json TEXT NOT NULL DEFAULT '[]',
        salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS portal_weeks (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
        week_number INTEGER NOT NULL,
        start_date_iso TEXT NOT NULL,
        end_date_iso TEXT NOT NULL,
        gregorian_range_ar TEXT NOT NULL,
        gregorian_range_en TEXT NOT NULL,
        hijri_range_ar TEXT NOT NULL,
        hijri_range_en TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        adherence_pct INTEGER NOT NULL DEFAULT 100,
        workout_completion_pct INTEGER NOT NULL DEFAULT 0,
        completed_exercises_count INTEGER NOT NULL DEFAULT 0,
        goals_summary TEXT NOT NULL DEFAULT '',
        coach_notes TEXT NOT NULL DEFAULT '',
        athlete_notes TEXT NOT NULL DEFAULT '',
        recorded_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_portal_weeks_account_week
        ON portal_weeks(account_id, week_number);

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
        sender_role TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_account_created
        ON chat_messages(account_id, created_at);
    `);
  }

  close(): void {
    this.db.close();
  }

  migrateLegacyJsonIfNeeded(legacyDir: string): void {
    const legacyAuthPath = path.join(legacyDir, 'admin-auth.json');
    const legacyCmsPath = path.join(legacyDir, 'cms-content.json');
    const legacyPortalPath = path.join(legacyDir, 'portal-accounts.json');

    const adminCount = (
      this.db.prepare('SELECT COUNT(*) AS cnt FROM admin_credentials').get() as { cnt: number }
    ).cnt;
    if (adminCount === 0) {
      const legacyAdmin = readStoredCredential(legacyAuthPath);
      if (legacyAdmin) {
        this.db
          .prepare(
            'INSERT OR IGNORE INTO admin_credentials (id, username, salt, password_hash, created_at) VALUES (1, ?, ?, ?, ?)'
          )
          .run(
            legacyAdmin.username,
            legacyAdmin.salt,
            legacyAdmin.passwordHash,
            legacyAdmin.createdAt || new Date().toISOString()
          );
      }
    }

    const cmsCount = (
      this.db.prepare('SELECT COUNT(*) AS cnt FROM cms_overrides').get() as { cnt: number }
    ).cnt;
    if (cmsCount === 0) {
      const legacyCms = readCmsOverrides(legacyCmsPath);
      if (legacyCms) {
        this.writeCmsOverrides(legacyCms);
      }
    }

    const portalCount = (
      this.db.prepare('SELECT COUNT(*) AS cnt FROM portal_accounts').get() as { cnt: number }
    ).cnt;
    if (portalCount === 0) {
      const legacyAccounts = readPortalAccounts(legacyPortalPath);
      for (const acc of legacyAccounts) {
        const weeklyGoals = createDefaultWeeklyGoals('ar');
        const workoutDays = createDefaultWorkoutDaysFromCoaching('ar');
        const nutritionPlan = createDefaultNutritionPlan(
          acc.targetCalories,
          acc.proteinGrams,
          acc.carbsGrams,
          acc.fatsGrams,
          'ar'
        );
        const supplements = createDefaultSupplements('ar');

        this.db
          .prepare(
            `INSERT OR IGNORE INTO portal_accounts (
              id, username, display_name, tier_code,
              target_calories, protein_grams, carbs_grams, fats_grams,
              split_title, active, completed_exercise_ids_json, weight_check_ins_json,
              coach_notes, weekly_goals_json, workout_days_json, nutrition_plan_json, supplements_json,
              salt, password_hash, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            acc.id,
            acc.username,
            acc.displayName,
            acc.tierCode,
            acc.targetCalories,
            acc.proteinGrams,
            acc.carbsGrams,
            acc.fatsGrams,
            acc.splitTitle,
            acc.active ? 1 : 0,
            JSON.stringify(acc.completedExerciseIds ?? []),
            JSON.stringify(acc.weightCheckIns ?? []),
            '',
            JSON.stringify(weeklyGoals),
            JSON.stringify(workoutDays),
            JSON.stringify(nutritionPlan),
            JSON.stringify(supplements),
            acc.salt,
            acc.passwordHash,
            acc.createdAt || new Date().toISOString(),
            acc.updatedAt || new Date().toISOString()
          );

        const checkIns = Array.isArray(acc.weightCheckIns) ? acc.weightCheckIns : [];
        const baseStart = new Date();
        baseStart.setUTCDate(baseStart.getUTCDate() - Math.max(0, checkIns.length - 1) * 7);
        const trimmedCheckIns = checkIns.slice(-MAX_PORTAL_WEEKS);
        for (let i = 0; i < trimmedCheckIns.length; i++) {
          const ci = trimmedCheckIns[i];
          const dt = new Date(baseStart);
          dt.setUTCDate(baseStart.getUTCDate() + i * 7);
          const iso = dt.toISOString().slice(0, 10);
          const range = formatDualDateRange(iso);
          this.db
            .prepare(
              `INSERT INTO portal_weeks (
                id, account_id, week_number, start_date_iso, end_date_iso,
                gregorian_range_ar, gregorian_range_en, hijri_range_ar, hijri_range_en,
                weight_kg, adherence_pct, workout_completion_pct, completed_exercises_count,
                goals_summary, coach_notes, athlete_notes, recorded_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              `wk-${i + 1}-${crypto.randomUUID().slice(0, 6)}`,
              acc.id,
              i + 1,
              range.startDateIso,
              range.endDateIso,
              range.gregorianRangeAr,
              range.gregorianRangeEn,
              range.hijriRangeAr,
              range.hijriRangeEn,
              ci.weightKg,
              100,
              0,
              acc.completedExerciseIds?.length ?? 0,
              ci.week || `الأسبوع ${i + 1}`,
              '',
              ci.note || '',
              acc.updatedAt || new Date().toISOString()
            );
        }
      }
    }
  }

  // --- Admin Auth ---
  private readStoredAdmin(): StoredAdminCredential | null {
    const row = this.db
      .prepare('SELECT username, salt, password_hash, created_at FROM admin_credentials WHERE id = 1')
      .get() as
      | { username: string; salt: string; password_hash: string; created_at: string }
      | undefined;
    if (!row) return null;
    return {
      username: row.username,
      salt: row.salt,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
    };
  }

  getAdminAuthStatus(_envUsername?: string, envPasscode?: string): AdminAuthStatus {
    if (envPasscode && envPasscode.trim().length > 0) {
      return {
        mode: 'env',
        configured: true,
      };
    }
    const stored = this.readStoredAdmin();
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

  claimAdminCredentials(
    username: string,
    password: string,
    envPasscode?: string
  ): { ok: true; username: string } | { ok: false; code: 'ALREADY_CONFIGURED' | 'INVALID_INPUT' } {
    const trimmedUser = username.trim();
    if (trimmedUser.length < 3 || trimmedUser.length > 80 || password.length < 8) {
      return { ok: false, code: 'INVALID_INPUT' };
    }
    if ((envPasscode && envPasscode.trim().length > 0) || this.readStoredAdmin()) {
      return { ok: false, code: 'ALREADY_CONFIGURED' };
    }
    const { salt, hash } = hashPassword(password);
    try {
      this.db
        .prepare(
          'INSERT INTO admin_credentials (id, username, salt, password_hash, created_at) VALUES (1, ?, ?, ?, ?)'
        )
        .run(trimmedUser, salt, hash, new Date().toISOString());
      return { ok: true, username: trimmedUser };
    } catch {
      return { ok: false, code: 'ALREADY_CONFIGURED' };
    }
  }

  verifyAdminCredentials(
    username: string,
    password: string,
    envUsername?: string,
    envPasscode?: string
  ): { ok: true; username: string } | { ok: false } {
    const trimmedUser = username.trim();
    if (!trimmedUser || !password) return { ok: false };

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

    const stored = this.readStoredAdmin();
    if (!stored) return { ok: false };
    const userMatches = safeEqualStrings(trimmedUser.toLowerCase(), stored.username.toLowerCase());
    const passMatches = verifyPassword(password, stored.salt, stored.passwordHash);
    if (userMatches && passMatches) {
      return { ok: true, username: stored.username };
    }
    return { ok: false };
  }

  // --- CMS Content ---
  readCmsOverrides(): Record<string, unknown> | null {
    const row = this.db
      .prepare('SELECT payload_json FROM cms_overrides WHERE id = 1')
      .get() as { payload_json: string } | undefined;
    if (!row) return null;
    const parsed = safeParseJson<unknown>(row.payload_json, null);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  }

  writeCmsOverrides(data: unknown): void {
    this.db
      .prepare(
        `INSERT INTO cms_overrides (id, payload_json, updated_at)
         VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payload_json = excluded.payload_json,
           updated_at = excluded.updated_at`
      )
      .run(JSON.stringify(data), new Date().toISOString());
  }

  resetCmsOverrides(): void {
    this.db.prepare('DELETE FROM cms_overrides WHERE id = 1').run();
  }

  // --- Portal Accounts ---
  private getAccountWeeksInternal(accountId: string): PortalWeekRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM portal_weeks WHERE account_id = ? ORDER BY week_number ASC`
      )
      .all(accountId) as unknown as RawPortalWeekRow[];
    return rows.map(mapWeekRow);
  }

  private hydratePublicAccount(row: RawPortalAccountRow): PortalAccountPublic {
    const weeklyRecords = this.getAccountWeeksInternal(row.id);
    const legacyCheckIns = safeParseJson<PortalWeightEntry[]>(row.weight_check_ins_json, []);
    const weightCheckIns: PortalWeightEntry[] =
      weeklyRecords.length > 0
        ? weeklyRecords.map((wk) => ({
            week: `الأسبوع ${wk.weekNumber}`,
            weightKg: wk.weightKg,
            note: wk.athleteNotes || wk.goalsSummary || wk.gregorianRangeAr,
          }))
        : legacyCheckIns;

    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      tierCode: normalizeTier(row.tier_code),
      targetCalories: row.target_calories,
      proteinGrams: row.protein_grams,
      carbsGrams: row.carbs_grams,
      fatsGrams: row.fats_grams,
      splitTitle: row.split_title,
      active: Boolean(row.active),
      coachNotes: row.coach_notes ?? '',
      completedExerciseIds: safeParseJson<string[]>(row.completed_exercise_ids_json, []),
      weightCheckIns,
      weeklyGoals: normalizeWeeklyGoals(safeParseJson(row.weekly_goals_json, [])),
      workoutDays: normalizeWorkoutDays(safeParseJson(row.workout_days_json, [])),
      nutritionPlan: normalizeNutritionPlan(
        safeParseJson(row.nutrition_plan_json, null),
        row.target_calories,
        row.protein_grams,
        row.carbs_grams,
        row.fats_grams
      ),
      supplements: normalizeSupplements(safeParseJson(row.supplements_json, [])),
      weeklyRecords,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  listPortalAccounts(): PortalAccountPublic[] {
    const rows = this.db
      .prepare('SELECT * FROM portal_accounts ORDER BY created_at ASC')
      .all() as unknown as RawPortalAccountRow[];
    return rows.map((row) => this.hydratePublicAccount(row));
  }

  getPortalAccountById(accountId: string): PortalAccountPublic | null {
    const row = this.db
      .prepare('SELECT * FROM portal_accounts WHERE id = ?')
      .get(accountId) as unknown as RawPortalAccountRow | undefined;
    return row ? this.hydratePublicAccount(row) : null;
  }

  createPortalAccount(
    input: CreatePortalAccountDbInput
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

    const existing = this.db
      .prepare('SELECT id FROM portal_accounts WHERE lower(username) = lower(?)')
      .get(trimmedUsername);
    if (existing) {
      return { ok: false, code: 'DUPLICATE_USERNAME' };
    }

    const now = new Date().toISOString();
    const { salt, hash } = hashPassword(password);
    const id = `portal_${crypto.randomUUID()}`;
    const displayName =
      typeof input.displayName === 'string' && input.displayName.trim().length > 0
        ? input.displayName.trim().slice(0, 80)
        : trimmedUsername;
    const tierCode = normalizeTier(input.tierCode);
    const targetCalories = clampInt(input.targetCalories, 2240, 1000, 6000);
    const proteinGrams = clampInt(input.proteinGrams, 190, 40, 400);
    const carbsGrams = clampInt(input.carbsGrams, 230, 20, 800);
    const fatsGrams = clampInt(input.fatsGrams, 62, 20, 250);
    const splitTitle =
      typeof input.splitTitle === 'string' && input.splitTitle.trim().length > 0
        ? input.splitTitle.trim().slice(0, 100)
        : 'علوي / سفلي متوازن (4 أيام)';
    const coachNotes =
      typeof input.coachNotes === 'string' ? input.coachNotes.trim().slice(0, 1000) : '';

    const weeklyGoals = input.weeklyGoals
      ? normalizeWeeklyGoals(input.weeklyGoals)
      : createDefaultWeeklyGoals('ar');
    const workoutDays = input.workoutDays
      ? normalizeWorkoutDays(input.workoutDays)
      : createDefaultWorkoutDaysFromCoaching('ar');
    const nutritionPlan = input.nutritionPlan
      ? normalizeNutritionPlan(
          input.nutritionPlan,
          targetCalories,
          proteinGrams,
          carbsGrams,
          fatsGrams
        )
      : createDefaultNutritionPlan(targetCalories, proteinGrams, carbsGrams, fatsGrams, 'ar');
    const supplements = input.supplements
      ? normalizeSupplements(input.supplements)
      : createDefaultSupplements('ar');

    const initialWeightKg = clampFloat(input.initialWeightKg, 82, 35, 250, 1);
    const week1 = createInitialWeekRecord(initialWeightKg, 'ar');
    const initialCheckIns: PortalWeightEntry[] = [
      { week: 'الأسبوع 1', weightKg: week1.weightKg, note: week1.athleteNotes },
    ];

    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db
        .prepare(
          `INSERT INTO portal_accounts (
            id, username, display_name, tier_code,
            target_calories, protein_grams, carbs_grams, fats_grams,
            split_title, active, completed_exercise_ids_json, weight_check_ins_json,
            coach_notes, weekly_goals_json, workout_days_json, nutrition_plan_json, supplements_json,
            salt, password_hash, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          trimmedUsername,
          displayName,
          tierCode,
          targetCalories,
          proteinGrams,
          carbsGrams,
          fatsGrams,
          splitTitle,
          input.active !== false ? 1 : 0,
          JSON.stringify([]),
          JSON.stringify(initialCheckIns),
          coachNotes,
          JSON.stringify(weeklyGoals),
          JSON.stringify(workoutDays),
          JSON.stringify(nutritionPlan),
          JSON.stringify(supplements),
          salt,
          hash,
          now,
          now
        );

      this.db
        .prepare(
          `INSERT INTO portal_weeks (
            id, account_id, week_number, start_date_iso, end_date_iso,
            gregorian_range_ar, gregorian_range_en, hijri_range_ar, hijri_range_en,
            weight_kg, adherence_pct, workout_completion_pct, completed_exercises_count,
            goals_summary, coach_notes, athlete_notes, recorded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          week1.id,
          id,
          week1.weekNumber,
          week1.startDateIso,
          week1.endDateIso,
          week1.gregorianRangeAr,
          week1.gregorianRangeEn,
          week1.hijriRangeAr,
          week1.hijriRangeEn,
          week1.weightKg,
          week1.adherencePct,
          week1.workoutCompletionPct,
          week1.completedExercisesCount,
          week1.goalsSummary,
          week1.coachNotes,
          week1.athleteNotes,
          week1.recordedAt
        );

      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }

    const account = this.getPortalAccountById(id)!;
    return { ok: true, account };
  }

  updatePortalAccount(
    accountId: string,
    input: UpdatePortalAccountDbInput
  ):
    | { ok: true; account: PortalAccountPublic }
    | { ok: false; code: 'NOT_FOUND' | 'INVALID_INPUT' | 'DUPLICATE_USERNAME' } {
    const existingRow = this.db
      .prepare('SELECT * FROM portal_accounts WHERE id = ?')
      .get(accountId) as unknown as RawPortalAccountRow | undefined;

    if (!existingRow) {
      return { ok: false, code: 'NOT_FOUND' };
    }

    const nextUsername =
      typeof input.username === 'string' ? input.username.trim() : existingRow.username;
    if (nextUsername.length < 3 || nextUsername.length > 60) {
      return { ok: false, code: 'INVALID_INPUT' };
    }

    const dup = this.db
      .prepare('SELECT id FROM portal_accounts WHERE id != ? AND lower(username) = lower(?)')
      .get(accountId, nextUsername);
    if (dup) {
      return { ok: false, code: 'DUPLICATE_USERNAME' };
    }

    let nextSalt = existingRow.salt;
    let nextHash = existingRow.password_hash;
    if (typeof input.password === 'string' && input.password.length > 0) {
      if (input.password.length < 3 || input.password.length > 128) {
        return { ok: false, code: 'INVALID_INPUT' };
      }
      const creds = hashPassword(input.password);
      nextSalt = creds.salt;
      nextHash = creds.hash;
    }

    const nextCalories =
      input.targetCalories !== undefined
        ? clampInt(input.targetCalories, existingRow.target_calories, 1000, 6000)
        : existingRow.target_calories;
    const nextProtein =
      input.proteinGrams !== undefined
        ? clampInt(input.proteinGrams, existingRow.protein_grams, 40, 400)
        : existingRow.protein_grams;
    const nextCarbs =
      input.carbsGrams !== undefined
        ? clampInt(input.carbsGrams, existingRow.carbs_grams, 20, 800)
        : existingRow.carbs_grams;
    const nextFats =
      input.fatsGrams !== undefined
        ? clampInt(input.fatsGrams, existingRow.fats_grams, 20, 250)
        : existingRow.fats_grams;

    const nextDisplayName =
      typeof input.displayName === 'string' && input.displayName.trim().length > 0
        ? input.displayName.trim().slice(0, 80)
        : existingRow.display_name;
    const nextTier = input.tierCode ? normalizeTier(input.tierCode) : normalizeTier(existingRow.tier_code);
    const nextSplit =
      typeof input.splitTitle === 'string' && input.splitTitle.trim().length > 0
        ? input.splitTitle.trim().slice(0, 100)
        : existingRow.split_title;
    const nextActive =
      input.active !== undefined ? (input.active ? 1 : 0) : existingRow.active;
    const nextCoachNotes =
      typeof input.coachNotes === 'string'
        ? input.coachNotes.trim().slice(0, 2000)
        : existingRow.coach_notes;

    const nextWeeklyGoalsJson =
      input.weeklyGoals !== undefined
        ? JSON.stringify(normalizeWeeklyGoals(input.weeklyGoals))
        : existingRow.weekly_goals_json;
    const nextWorkoutDaysJson =
      input.workoutDays !== undefined
        ? JSON.stringify(normalizeWorkoutDays(input.workoutDays))
        : existingRow.workout_days_json;
    const nextNutritionPlanJson =
      input.nutritionPlan !== undefined
        ? JSON.stringify(
            normalizeNutritionPlan(
              input.nutritionPlan,
              nextCalories,
              nextProtein,
              nextCarbs,
              nextFats
            )
          )
        : existingRow.nutrition_plan_json;
    const nextSupplementsJson =
      input.supplements !== undefined
        ? JSON.stringify(normalizeSupplements(input.supplements))
        : existingRow.supplements_json;
    const nextCompletedExercisesJson = Array.isArray(input.completedExerciseIds)
      ? JSON.stringify(
          input.completedExerciseIds
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
            .slice(0, 200)
        )
      : existingRow.completed_exercise_ids_json;

    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE portal_accounts SET
          username = ?,
          display_name = ?,
          tier_code = ?,
          target_calories = ?,
          protein_grams = ?,
          carbs_grams = ?,
          fats_grams = ?,
          split_title = ?,
          active = ?,
          coach_notes = ?,
          weekly_goals_json = ?,
          workout_days_json = ?,
          nutrition_plan_json = ?,
          supplements_json = ?,
          completed_exercise_ids_json = ?,
          salt = ?,
          password_hash = ?,
          updated_at = ?
         WHERE id = ?`
      )
      .run(
        nextUsername,
        nextDisplayName,
        nextTier,
        nextCalories,
        nextProtein,
        nextCarbs,
        nextFats,
        nextSplit,
        nextActive,
        nextCoachNotes,
        nextWeeklyGoalsJson,
        nextWorkoutDaysJson,
        nextNutritionPlanJson,
        nextSupplementsJson,
        nextCompletedExercisesJson,
        nextSalt,
        nextHash,
        now,
        accountId
      );

    const updated = this.getPortalAccountById(accountId)!;
    return { ok: true, account: updated };
  }

  deletePortalAccount(accountId: string): boolean {
    const res = this.db.prepare('DELETE FROM portal_accounts WHERE id = ?').run(accountId);
    return res.changes > 0;
  }

  verifyPortalCredentials(
    username: string,
    password: string
  ):
    | { ok: true; account: PortalAccountPublic }
    | { ok: false; code: 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED' } {
    const trimmedUser = typeof username === 'string' ? username.trim() : '';
    if (!trimmedUser || !password) {
      return { ok: false, code: 'INVALID_CREDENTIALS' };
    }

    const row = this.db
      .prepare('SELECT * FROM portal_accounts WHERE lower(username) = lower(?)')
      .get(trimmedUser) as unknown as RawPortalAccountRow | undefined;

    if (!row || !safeEqualStrings(row.username.toLowerCase(), trimmedUser.toLowerCase())) {
      return { ok: false, code: 'INVALID_CREDENTIALS' };
    }

    if (!verifyPassword(password, row.salt, row.password_hash)) {
      return { ok: false, code: 'INVALID_CREDENTIALS' };
    }

    if (row.active === 0) {
      return { ok: false, code: 'ACCOUNT_DISABLED' };
    }

    return { ok: true, account: this.hydratePublicAccount(row) };
  }

  updatePortalAccountProgress(
    accountId: string,
    completedExerciseIds?: unknown,
    weightCheckIns?: unknown,
    weeklyGoals?: unknown
  ): PortalAccountPublic | null {
    const existing = this.db
      .prepare('SELECT * FROM portal_accounts WHERE id = ?')
      .get(accountId) as unknown as RawPortalAccountRow | undefined;
    if (!existing) return null;

    const nextExercises = Array.isArray(completedExerciseIds)
      ? completedExerciseIds
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          .slice(0, 200)
      : safeParseJson<string[]>(existing.completed_exercise_ids_json, []);

    const nextGoalsJson =
      weeklyGoals !== undefined
        ? JSON.stringify(normalizeWeeklyGoals(weeklyGoals))
        : existing.weekly_goals_json;

    const now = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE portal_accounts
         SET completed_exercise_ids_json = ?,
             weekly_goals_json = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(JSON.stringify(nextExercises), nextGoalsJson, now, accountId);

    // If caller sent a new weightCheckIn item appended from legacy handler, keep portal_weeks synced cleanly
    if (Array.isArray(weightCheckIns) && weightCheckIns.length > 0) {
      const currentWeeks = this.getAccountWeeksInternal(accountId);
      if (weightCheckIns.length > currentWeeks.length) {
        const latest = weightCheckIns[weightCheckIns.length - 1] as Record<string, unknown>;
        const weightVal = clampFloat(latest?.weightKg, 82, 35, 250, 1);
        const noteVal = typeof latest?.note === 'string' ? latest.note.trim().slice(0, 200) : '';
        this.addPortalWeekRecord(accountId, {
          weightKg: weightVal,
          athleteNotes: noteVal,
        });
      }
    }

    return this.getPortalAccountById(accountId);
  }

  /**
   * Adds a new week record with automatic Gregorian + Hijri start/end dates.
   * Enforces the 16-week rolling window atomically:
   * When inserting Week 17 (or total > 16), the oldest week (Week 1) is automatically deleted.
   */
  addPortalWeekRecord(
    accountId: string,
    input: AddPortalWeekInput
  ): {
    account: PortalAccountPublic;
    addedWeek: PortalWeekRecord;
    evictedWeekNumbers: number[];
  } | null {
    const evictedWeekNumbers: number[] = [];
    let addedWeek: PortalWeekRecord | null = null;

    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existingAcc = this.db
        .prepare(
          'SELECT id, completed_exercise_ids_json, workout_days_json FROM portal_accounts WHERE id = ?'
        )
        .get(accountId) as
        | { id: string; completed_exercise_ids_json: string; workout_days_json: string }
        | undefined;

      if (!existingAcc) {
        this.db.exec('ROLLBACK');
        return null;
      }

      const currentWeeks = this.getAccountWeeksInternal(accountId);
      const { weekNumber, range: autoRange } = computeNextWeekDates(
        currentWeeks,
        input.startDateIso
      );
      const range = input.endDateIso
        ? formatDualDateRange(autoRange.startDateIso, input.endDateIso)
        : autoRange;

      const completedIds = safeParseJson<string[]>(existingAcc.completed_exercise_ids_json, []);
      const workoutDays = normalizeWorkoutDays(safeParseJson(existingAcc.workout_days_json, []));
      const totalExercises = workoutDays.reduce((sum, d) => sum + d.exercises.length, 0);
      const defaultCompletionPct =
        totalExercises > 0 ? Math.round((completedIds.length / totalExercises) * 100) : 0;

      addedWeek = {
        id: `wk-${weekNumber}-${crypto.randomUUID().slice(0, 6)}`,
        weekNumber,
        startDateIso: range.startDateIso,
        endDateIso: range.endDateIso,
        gregorianRangeAr: range.gregorianRangeAr,
        gregorianRangeEn: range.gregorianRangeEn,
        hijriRangeAr: range.hijriRangeAr,
        hijriRangeEn: range.hijriRangeEn,
        weightKg: clampFloat(input.weightKg, 80, 35, 250, 1),
        adherencePct: clampInt(input.adherencePct, 95, 0, 100),
        workoutCompletionPct: clampInt(input.workoutCompletionPct, defaultCompletionPct, 0, 100),
        completedExercisesCount: clampInt(
          input.completedExercisesCount,
          completedIds.length,
          0,
          200
        ),
        goalsSummary:
          typeof input.goalsSummary === 'string' && input.goalsSummary.trim()
            ? input.goalsSummary.trim().slice(0, 200)
            : `أهداف الأسبوع ${weekNumber}`,
        coachNotes:
          typeof input.coachNotes === 'string' ? input.coachNotes.trim().slice(0, 300) : '',
        athleteNotes:
          typeof input.athleteNotes === 'string' ? input.athleteNotes.trim().slice(0, 300) : '',
        recordedAt: new Date().toISOString(),
      };

      this.db
        .prepare(
          `INSERT INTO portal_weeks (
            id, account_id, week_number, start_date_iso, end_date_iso,
            gregorian_range_ar, gregorian_range_en, hijri_range_ar, hijri_range_en,
            weight_kg, adherence_pct, workout_completion_pct, completed_exercises_count,
            goals_summary, coach_notes, athlete_notes, recorded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          addedWeek.id,
          accountId,
          addedWeek.weekNumber,
          addedWeek.startDateIso,
          addedWeek.endDateIso,
          addedWeek.gregorianRangeAr,
          addedWeek.gregorianRangeEn,
          addedWeek.hijriRangeAr,
          addedWeek.hijriRangeEn,
          addedWeek.weightKg,
          addedWeek.adherencePct,
          addedWeek.workoutCompletionPct,
          addedWeek.completedExercisesCount,
          addedWeek.goalsSummary,
          addedWeek.coachNotes,
          addedWeek.athleteNotes,
          addedWeek.recordedAt
        );

      const allAfterInsert = this.db
        .prepare(
          'SELECT id, week_number FROM portal_weeks WHERE account_id = ? ORDER BY week_number ASC, recorded_at ASC'
        )
        .all(accountId) as { id: string; week_number: number }[];

      if (allAfterInsert.length > MAX_PORTAL_WEEKS) {
        const excess = allAfterInsert.length - MAX_PORTAL_WEEKS;
        const toDelete = allAfterInsert.slice(0, excess);
        const delStmt = this.db.prepare('DELETE FROM portal_weeks WHERE id = ? AND account_id = ?');
        for (const item of toDelete) {
          delStmt.run(item.id, accountId);
          evictedWeekNumbers.push(item.week_number);
        }
      }

      const remaining = this.getAccountWeeksInternal(accountId);
      const syncedCheckIns: PortalWeightEntry[] = remaining.map((wk) => ({
        week: `الأسبوع ${wk.weekNumber}`,
        weightKg: wk.weightKg,
        note: wk.athleteNotes || wk.goalsSummary,
      }));

      this.db
        .prepare(
          'UPDATE portal_accounts SET weight_check_ins_json = ?, updated_at = ? WHERE id = ?'
        )
        .run(JSON.stringify(syncedCheckIns), new Date().toISOString(), accountId);

      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }

    return {
      account: this.getPortalAccountById(accountId)!,
      addedWeek: addedWeek!,
      evictedWeekNumbers,
    };
  }

  deletePortalWeekRecord(accountId: string, weekId: string): PortalAccountPublic | null {
    const res = this.db
      .prepare('DELETE FROM portal_weeks WHERE id = ? AND account_id = ?')
      .run(weekId, accountId);
    if (res.changes === 0) return null;

    const remaining = this.getAccountWeeksInternal(accountId);
    const syncedCheckIns: PortalWeightEntry[] = remaining.map((wk) => ({
      week: `الأسبوع ${wk.weekNumber}`,
      weightKg: wk.weightKg,
      note: wk.athleteNotes || wk.goalsSummary,
    }));
    this.db
      .prepare('UPDATE portal_accounts SET weight_check_ins_json = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(syncedCheckIns), new Date().toISOString(), accountId);

    return this.getPortalAccountById(accountId);
  }

  // --- Chat Messages ---
  listChatMessages(accountId: string, limit = 200): PortalChatMessage[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM chat_messages
         WHERE account_id = ?
         ORDER BY created_at ASC
         LIMIT ?`
      )
      .all(accountId, Math.min(500, Math.max(1, limit))) as unknown as RawChatRow[];
    return rows.map(mapChatRow);
  }

  addChatMessage(
    accountId: string,
    senderRole: 'admin' | 'portal',
    senderName: string,
    body: string
  ): PortalChatMessage | null {
    const exists = this.db
      .prepare('SELECT id FROM portal_accounts WHERE id = ?')
      .get(accountId);
    if (!exists) return null;

    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 2000) return null;

    const msg: PortalChatMessage = {
      id: `msg_${crypto.randomUUID()}`,
      accountId,
      senderRole,
      senderName: senderName.trim().slice(0, 80) || (senderRole === 'admin' ? 'Coach' : 'Athlete'),
      body: trimmed,
      createdAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `INSERT INTO chat_messages (id, account_id, sender_role, sender_name, body, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(msg.id, msg.accountId, msg.senderRole, msg.senderName, msg.body, msg.createdAt);

    return msg;
  }

  // --- Exports (Stripped of all salts/hashes) ---
  exportPortalAccountData(accountId: string) {
    const account = this.getPortalAccountById(accountId);
    if (!account) return null;
    const chatMessages = this.listChatMessages(accountId, 500);
    return buildSanitizedPortalExport(
      account as unknown as PortalAccountPublic & Record<string, unknown>,
      chatMessages
    );
  }

  exportAllAdminData() {
    const overrides = this.readCmsOverrides();
    const cmsBundle = overrides
      ? mergeSiteContentBundle(overrides)
      : getDefaultSiteContentBundle();
    const accounts = this.listPortalAccounts();
    const chatByAccount: Record<string, PortalChatMessage[]> = {};
    for (const acc of accounts) {
      chatByAccount[acc.id] = this.listChatMessages(acc.id, 500);
    }
    return buildSanitizedAdminFullExport(
      cmsBundle,
      accounts as unknown as (PortalAccountPublic & Record<string, unknown>)[],
      chatByAccount
    );
  }
}
