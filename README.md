# iEPMS Attendance Monitor Plugin

`iepms-attendance-plugin` adds a local attendance-monitoring and secure configuration panel to DeepSeek Harness.

Version 0.5.1 provides two switchable views. The management view reads sanitized health, schedule state and recent status from `D:\dingding\daka`, can update the local iEPMS account and runtime policy, and includes a searchable, paged employee roster editor. Plugin-owned data is stored in the SQLite database `D:\dingding\daka\iepms-attendance-plugin.db`: roster rows, personal account selection and schedule preferences, personal attendance history, and personal run state. Existing `roster.xlsx` and the previous personal JSON state are imported once on first use; the Excel file remains unchanged as a migration source and is no longer rewritten by the plugin.

The personal view has its own account selector and a one-row roster editor for the employee bound to that account. It cannot browse or modify other employees. Personal synchronization and its immediate/scheduled execution still require the secured management login because the upstream iEPMS API is available only through a management session; after retrieval, records are filtered to the selected personal account. Personal runs never invoke DingTalk alert delivery. Completion and failure messages are retained in the local run state and displayed only inside the plugin.

Passwords remain in Windows Credential Manager / DPAPI and are never written to the database, `config.json`, or returned to DSH. The legacy `config.json` remains the upstream iEPMS runtime configuration. Per-employee Webhook values are stored locally in SQLite but are never echoed to the browser; the roster editor receives only a configured/not-configured flag. The plugin API returns only sanitized roster data and masked account identifiers.

When a local `last_attendance_data.json` exists, opening the personal view stores a derived local history cache in SQLite. The cache is account-scoped by a SHA-256 identifier and contains only date, clock-in/out time, work duration and normalized status. It contains no employee name, project, mobile number, DingTalk ID, password, Webhook or raw account value.

The personal view also provides a local make-up punch register for records identified as `缺卡`. A standard request can be created through the end of the third calendar day (for example, a Monday missed punch remains eligible until Wednesday 23:59:59). Once that window has passed, the register accepts only an overtime make-up request with a past non-working date. Non-working-day validation uses the existing `chinese-calendar` backend dependency, with a weekend-only fallback if that dependency is unavailable. Requests are stored account-scoped in `personal_makeup_requests` with status `local-pending`; no iEPMS make-up request is sent until a verified upstream submission interface is integrated.

The package intentionally uses Cordis and Schemastery from the DSH host runtime. It must be installed into a DSH Desktop profile, not run as a standalone Node application.

## Development

```powershell
cd D:\work\dsh\iepms-attendance-plugin
npm install
npm test
npm run pack:check
```

The bundled Python bridge can be tested without any network activity:

```powershell
$env:IEPMS_BACKEND_ROOT='D:\dingding\daka'
'{"version":1,"command":"status"}' | python .\backend\iepms_bridge.py
```

The bridge loads the existing `keyring_utils.py` from `IEPMS_BACKEND_ROOT`. The plugin sets this path from its trusted server-side configuration; it is never accepted from a browser request.

See `DEVELOPMENT_PLAN.md` for the staged implementation plan.
