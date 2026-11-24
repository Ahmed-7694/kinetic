# Security Summary

**Reviewed Files**: 22
**Issues Resolved**: 6

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| CSV Spreadsheet Formula Injection | `src/utils/portalPlanning.ts` | 615 | Athlete or coach text notes starting with `=`, `+`, `-`, `@`, or tab were exported directly into CSV files without neutralization, allowing formula evaluation in spreadsheet software. | Medium | Fixed | Prefixed any CSV cell value starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single quote `'` before standard CSV quoting. |
| Unvalidated CMS Payload Schema | `server/appServer.ts` | 351 | `PUT /api/cms` only checked `typeof body.content === 'object'`, which allowed arrays and unvalidated arbitrary fields to be persisted to SQLite. | Medium | Fixed | Rejected arrays explicitly and normalized incoming payloads through `mergeSiteContentBundle` before saving and returning data. |
| Live WebSocket Session & Account Revocation | `server/appServer.ts` | 229 | WebSocket chat connections verified token expiry and account active status only at upgrade time, allowing disabled accounts or expired sessions to keep sending messages over an already-open socket. | Medium | Fixed | Stored `tokenExp` on each socket, checked expiration on every incoming frame (closing with `4401`), and verified live portal `active` status on `chat:send` (closing with `4403` when disabled). |
| Unauthenticated Admin Username Disclosure | `server/db.ts` & `server/authAndStore.ts` | 606 | `GET /api/admin/status` returned `usernameHint` before authentication, exposing the configured administrator login name. | Low | Fixed | Removed `usernameHint` from `getAuthStatus` and `getAdminAuthStatus` responses. |
| Missing Login Rate Throttling & Security Headers | `server/appServer.ts` | 68 | Admin and portal login routes lacked failed-attempt throttling, and HTTP responses omitted baseline hardening headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). | Medium | Fixed | Added per-IP sliding-window throttling (`429` after repeated failed logins) on `/api/admin/login` and `/api/portal/login`, disabled `X-Powered-By`, and added iframe-safe baseline security headers. |
| Non-Atomic 16-Week Numbering Read | `server/db.ts` | 1163 | `addPortalWeekRecord` queried existing weeks and calculated the next week number prior to starting the `BEGIN IMMEDIATE` transaction, creating a narrow concurrent duplicate-week race window. | Low | Fixed | Moved account lookup, week sequence reading, and date calculation inside the `BEGIN IMMEDIATE` write transaction. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Password Hashing & Credentials | `server/authAndStore.ts`, `server/db.ts` | All admin and athlete passwords are salted and hashed with `crypto.scryptSync` and compared with `crypto.timingSafeEqual`; exports strip `salt` and `passwordHash`. |
| Session Tokens & Role Isolation | `server/authAndStore.ts`, `server/appServer.ts` | Stateless bearer tokens are HMAC-SHA256 signed with an explicit `role` (`admin` vs `portal`) and `aid` binding; WebSocket upgrades and REST middleware reject cross-role and cross-account access. |
| Database Queries | `server/db.ts` | Uses parameterized SQLite prepared statements (`?` bindings) across all reads, writes, deletes, and migrations. |
| Path Confinement | `server/authAndStore.ts` | `resolveConfinedPath` validates resolved filenames stay strictly inside the target base directory. |
| Dependency Audit | `package.json`, `bun.lock` | `bun audit` checked 261 installed packages and reported zero known vulnerabilities. |

---

## PoC Verification

### Spreadsheet Formula Injection in 16-Week CSV Export

#### Summary
| Field | Value |
|---|---|
| Issue Type | Unescaped Spreadsheet Formula Characters in CSV Export |
| Impact | Medium |
| Affected File | `src/utils/portalPlanning.ts:615` |
| Test Scenario | Export a week record containing `=cmd|'/C calc'!A0`, `+SUM(A1:A2)`, and `@HYPERLINK("http://evil.example","click")`. |

#### How It Was Fixed
`escapeCsvCell` now prefixes any cell value matching `/^[=+\-@\t\r]/` with a leading apostrophe (`'`) before applying double-quote CSV escaping.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | `formatPortalWeeksCsv` maps `goalsSummary`, `coachNotes`, and `athleteNotes` through `escapeCsvCell` at `src/utils/portalPlanning.ts:669-674` | Formula-prefixed note enters sanitizer |
| 2 | `escapeCsvCell` at `src/utils/portalPlanning.ts:617` detects leading `=`, `+`, `-`, `@`, `\t`, or `\r` and prepends `'` | Value becomes `'=cmd|...`, `'+SUM(...)`, `'@HYPERLINK(...)` |
| 3 | Final `.csv` download opens in spreadsheet software | **Handled Safely** (rendered as literal text, never evaluated as a formula) |

#### Conclusion
**Fix Verified** - Formula-prefixed user notes in CSV exports are neutralized and verified by automated unit tests (`src/utils/portalPlanning.test.ts`).

---

### Unvalidated CMS Payload & Live WebSocket Revocation

#### Summary
| Field | Value |
|---|---|
| Issue Type | Permissive Input Validation & Stale Socket Authorization |
| Impact | Medium |
| Affected File | `server/appServer.ts:229`, `server/appServer.ts:351` |
| Test Scenario | 1) `PUT /api/cms` with `{ content: ["invalid-array"] }`; 2) Open WebSocket for an active athlete, disable the account via `PUT /api/admin/portal-accounts/:id`, then send a `chat:send` frame. |

#### How It Was Fixed
`PUT /api/cms` rejects arrays (`400`) and normalizes valid partial payloads through `mergeSiteContentBundle`. The WebSocket `message` handler verifies `Date.now() <= client.tokenExp` (`4401`) and queries live portal account `active` status before persisting `chat:send` (`4403`).

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | `PUT /api/cms` receives `{ content: ["invalid-array"] }` at `server/appServer.ts:351` | `Array.isArray(body.content)` returns `true` -> rejected with HTTP `400` |
| 2 | Disabled athlete sends `{ type: 'chat:send', body: 'Should be blocked' }` over an existing WebSocket at `server/appServer.ts:253` | `db.getPortalAccountById` returns `active: false` |
| 3 | Server terminates the socket without saving or broadcasting | Socket closes immediately with code `4403` (**Handled Safely**) |

#### Conclusion
**Fix Verified** - Verified end-to-end against the live HTTP + WebSocket test suite (`server/appServer.test.ts`, 30/30 tests passing).
