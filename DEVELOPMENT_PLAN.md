# iEPMS Attendance Monitor DSH Plugin Development Plan

## 1. Goal

Create `iepms-attendance-plugin`, a local DeepSeek Harness (DSH) desktop plugin for the existing iEPMS attendance monitoring tool at `D:\dingding\daka`.

The plugin will follow the project structure and delivery conventions of `ltx-jc-rag`:

- an independently installable Cordis/DSH plugin package;
- a top-level left-sidebar entry named `考勤监控`;
- a bundled DSH client module for the native desktop UI;
- a server-side plugin runtime that exposes only scoped local operations;
- a `cordis.patch.yml` installer patch and reproducible build/test/package scripts.

The plugin must retain the proven Python monitoring logic during the first release. The `customtkinter` application is not embedded in DSH; its operational functions are gradually replaced by a DSH-native React UI.

## 2. Compatibility Baseline

- DSH desktop plugin API: `0.2.0-rc.2` family, verified against the active desktop development profile.
- Runtime: Node.js `^22.19.0 || >=24.0.0`.
- Host platform for the monitoring backend: Windows 10/11 x64.
- Python backend baseline: existing `D:\dingding\daka` V4.1.1 source and its pinned requirements.
- Initial plugin ID and npm package name: `iepms-attendance-plugin`.
- Default per-profile plugin data root: `dshHomePath('iepms-attendance-plugin')`.

## 3. Scope

### Included

- A native DSH operational panel for monitoring status, recent results, roster summary, task schedule state, logs and exports.
- A small Python bridge with a versioned JSON request/response contract.
- Read-only inspection of existing configuration and persisted status.
- Explicit, user-initiated actions: run inspection, refresh login/session, export report, and manage scheduled tasks.
- Install, update, build, test and packaging documentation.

### Explicitly Excluded From MVP

- Rewriting the iEPMS login, attendance rules, DingTalk delivery, scheduler or Excel logic in TypeScript.
- Allowing model chat, tools, prompt text or background automation to initiate attendance checks, login actions or DingTalk sending.
- Sending credentials, cookies, webhook URLs, employee contact data or raw attendance records to a remote service.
- Replacing the existing Windows Credential Manager / DPAPI credential storage.
- Removing the existing `customtkinter` application before the plugin has completed parallel validation.

## 4. Architecture

```text
DSH desktop
  └─ iepms-attendance-plugin
       ├─ Cordis runtime (authorization, API, process lifecycle)
       ├─ React client (native panel and settings)
       └─ scoped local bridge invocation
            └─ D:\dingding\daka\iepms_bridge.py
                 ├─ existing attendance monitor
                 ├─ existing login / session keeper
                 ├─ existing export manager
                 ├─ existing task scheduler
                 └─ Windows Credential Manager / DPAPI
```

### Process Boundary

The plugin server invokes the bridge using `spawnFile` with a fixed executable or Python path and a fixed command allowlist. The browser client never invokes Python, PowerShell or shell commands directly.

The bridge reads a single JSON request from standard input and emits one structured JSON response to standard output. Diagnostic output is written to standard error and filtered before it is surfaced in DSH. It must not accept arbitrary module names, file paths, command arguments or shell fragments from the client.

### Initial Bridge Commands

| Command | Purpose | Side effect | UI rule |
| --- | --- | --- | --- |
| `status` | Read backend/version/configuration health and last-run summary | None | Automatic refresh allowed |
| `roster-summary` | Return aggregate project/person counts only | None | Automatic refresh allowed |
| `schedule-status` | Read managed Windows task state | None | Automatic refresh allowed |
| `recent-runs` | Read sanitized recent run summaries | None | Automatic refresh allowed |
| `export-list` | List safe, configured report artifacts | None | Automatic refresh allowed |
| `run-check` | Run one monitor cycle under existing safety rules | May log in and send notifications | Explicit button plus confirmation |
| `refresh-session` | Refresh iEPMS session | Network/login side effect | Explicit button plus confirmation |
| `export-report` | Generate a report in configured safe directory | Writes file | Explicit button |
| `schedule-update` | Create, update or disable approved scheduled tasks | Changes Task Scheduler | Explicit button plus confirmation |

All state-changing requests require an operation nonce issued by the plugin runtime and are serialized with a single-operation lock. The runtime records an audit entry containing operation type, time, caller surface and outcome, but never secrets or raw attendance details.

## 5. Security and Privacy Rules

- Passwords remain in Windows Credential Manager / DPAPI. The plugin may display only “configured / not configured” and a masked account identifier.
- Webhook URLs, cookies, tokens and login traces are never returned to the DSH client, chat session, DSH logs or test snapshots.
- Employee names, account IDs, mobile numbers and detailed attendance results are not included in the default dashboard. Detailed data requires a future, separately approved access design.
- The plugin must redact sensitive values before returning bridge errors or logs.
- The bridge rejects requests unless the caller is the local plugin runtime. It does not listen on a network port.
- No automatic job is created by installation, plugin startup or page refresh.
- `run-check` keeps the current V4.1.1 guardrails: invalid roster returns `config_error`; missing API data returns `no_data`; failed/incomplete runs cannot write a success heartbeat; DingTalk idempotency remains enforced.
- Every action that can trigger login, network traffic, notification delivery, file creation or Windows task mutation is visibly marked in the UI and requires direct user intent.

## 6. Milestones

## Phase 0: Contract and Backend Preparation

### Tasks

- [x] Inventory the existing Python public functions and persisted state files without exposing operational secrets.
- [x] Add `iepms_bridge.py` beside the existing Python source.
- [x] Define typed request/response schemas, command versions, result codes and redaction behavior.
- [ ] Refactor only the minimum Python entry points needed to call status, run, export and scheduler logic without starting `customtkinter`.
- [ ] Add a backend single-operation lock, timeout handling and process-result normalization.
- [x] Add tests for invalid request rejection, sensitive-value redaction and no-network read-only status calls.

### Acceptance Criteria

- `python iepms_bridge.py` supports only documented JSON commands.
- `status` and other read-only commands produce no login, iEPMS request or DingTalk delivery.
- A malformed request cannot execute an arbitrary Python function, shell command or file path.

## Phase 1: Plugin Scaffold and Installation

### Tasks

- [x] Create `package.json`, `tsconfig.json`, `cordis.patch.yml`, `src/index.ts`, `src/client.tsx`, build script, test suite, README and plan references.
- [x] Register plugin ID `iepms-attendance-plugin` and the fixed local backend configuration.
- [x] Declare DSH client injections required for sidebar, conversation workspace and renderer integration.
- [x] Register a `考勤监控` sidebar entry using the official sidebar extension slot.
- [x] Build the client bundle with the same module-loader contract used by `ltx-jc-rag`.
- [x] Add packaging validation with `npm test` and `npm run pack:check`.

### Acceptance Criteria

- The package installs into the target DSH profile without modifying DSH core source.
- The sidebar entry appears once, navigates correctly and survives desktop restart.
- Build, tests and `npm pack --dry-run` complete successfully.

## Phase 2: Read-Only Operations Panel

### Tasks

- [x] Register authenticated local management routes inside the plugin runtime.
- [x] Implement runtime-to-bridge process invocation with fixed command allowlist, timeout and sanitized errors.
- [x] Build a compact native panel: service status, roster aggregates, schedule state and sanitized recent-run summaries.
- [x] Display backend availability states: unavailable, Python runtime missing, configuration incomplete and healthy.
- [x] Add a recent-run timeline that contains only aggregate status and redacted error summaries.
- [ ] Add an export artifact list with a safe “open containing folder” action restricted to configured export roots.
- [ ] Respect the DSH desktop theme and narrow-screen layout.

### Acceptance Criteria

- Opening or refreshing the panel causes no external request and no notification.
- The panel clearly distinguishes unavailable configuration from a completed inspection.
- No secret, webhook, cookie, employee mobile number or raw credential appears in DOM, API responses or browser console.

## Phase 3: Explicit Operational Actions

### Tasks

- [ ] Add `立即巡检` with a confirmation dialog that states it may access iEPMS and send configured notifications.
- [ ] Add `刷新会话` with equivalent network/login confirmation.
- [ ] Add `导出报表` with report type and safe output-directory selection.
- [ ] Implement visible operation lifecycle: queued, running, completed, failed, timed out and cancelled.
- [ ] Prevent parallel inspection/login/export operations and show the active operation owner/state.
- [ ] Preserve existing timeout, failure, no-data, configuration-error, heartbeat and DingTalk idempotency behavior.
- [ ] Provide a sanitized operation result summary and link only to permitted local report folders.

### Acceptance Criteria

- Actions cannot be triggered by plugin page load, model-generated content or an unconfirmed API call.
- One user click produces at most one bridge invocation.
- Failed or partial runs cannot be presented as healthy/completed monitoring state.

## Phase 4: Schedule, Roster and Configuration Management

### Tasks

- [ ] Surface existing managed Task Scheduler tasks and their next/last run state.
- [ ] Add explicit enable, edit and disable flows that use the existing scheduler safeguards.
- [ ] Add roster validation and aggregate preview before accepting a roster replacement.
- [x] Add configuration health checks for account presence, credential availability, webhook presence and browser/dependency readiness without returning their values.
- [x] Add a guarded DSH settings form for account credentials, Webhook, browser channel and overnight policy while retaining backward compatibility with the legacy GUI.
- [x] Add switchable management and personal dashboards with account-scoped local attendance history, monthly calendar, aggregate statistics and recent records.
- [ ] Keep configuration file formats backward-compatible until a migration and rollback path is tested.

### Acceptance Criteria

- Schedule changes are never applied silently and can be verified after the action.
- Invalid roster/configuration is rejected before a monitor run.
- Existing legacy GUI and plugin can safely coexist over the same backend data without concurrent mutation corruption.

## Phase 5: Validation, Migration and Release

### Tasks

- [ ] Run the existing Python V4.1.1 regression suite unchanged.
- [ ] Add Python bridge unit tests and plugin runtime/client contract tests.
- [ ] Add integration tests for bridge failure, dependency missing, action confirmation, operation locking and redaction.
- [ ] Test desktop install/update/uninstall using the DSH development profile.
- [ ] Run at least five workdays of parallel observation against the current GUI workflow before recommending production replacement.
- [ ] Document installation, Python/backend prerequisites, diagnostics, backup, uninstall and rollback.
- [ ] Generate release notes and package checksum inventory.

### Acceptance Criteria

- Existing safety regression tests pass.
- Plugin tests pass and no test fixture contains real employee, account, webhook, password, cookie or internal endpoint data.
- A clean machine can install the plugin and obtain a clear prerequisite/status diagnosis.
- Uninstalling the plugin does not delete Python source, Windows credentials, reports, scheduler tasks or historical backend data unless the user explicitly requests it.

## 7. Initial File Layout

```text
iepms-attendance-plugin/
  DEVELOPMENT_PLAN.md
  README.md
  CHANGELOG.md
  package.json
  tsconfig.json
  cordis.patch.yml
  scripts/
    build-client.mjs
  src/
    index.ts                 # Cordis runtime and local API registration
    config.ts                # Profile-scoped plugin config
    bridge.ts                # Fixed-command Python bridge invoker
    contracts.ts             # Runtime/bridge request and response types
    redaction.ts             # Shared response/log redaction
    client.tsx               # Sidebar registration and native panel
    client.css
  test/
    bridge.test.mjs
    runtime.test.mjs
    client-contract.test.mjs

D:\dingding\daka/
  iepms_bridge.py            # New local JSON bridge
  ...existing Python modules
```

## 8. Delivery Order

1. Phase 0: Stabilize a small Python bridge and prove read-only safety.
2. Phase 1: Create/install the DSH plugin skeleton and sidebar entry.
3. Phase 2: Deliver the read-only operations dashboard.
4. Phase 3: Add confirmed manual operations one at a time, starting with inspection.
5. Phase 4: Add scheduler/roster/configuration management after coexistence tests.
6. Phase 5: Complete parallel validation, documentation and package release.

## 9. MVP Definition

The first installable MVP includes:

- the `考勤监控` sidebar entry and native DSH panel;
- backend prerequisite and status diagnostics;
- sanitized last-run, roster aggregate and scheduler state;
- no automatic external action;
- the Python bridge contract and its security tests.

The first post-MVP increment adds one confirmed `立即巡检` action. Schedule management, roster mutation, detailed personnel views and full settings migration are deferred until the bridge and coexistence path are validated.
