# iEPMS Attendance Monitor Plugin

`iepms-attendance-plugin` adds a local attendance-monitoring and secure configuration panel to DeepSeek Harness.

Version 0.8.0 is self-contained: its Python bridge and login, credential, monitoring, scheduling and attendance support modules are packaged under `backend/`. Runtime data is stored under `%LOCALAPPDATA%\DeepSeek Harness\plugins\iepms-attendance-plugin` by default, including the SQLite database, roster, configuration, session and local history. It does not import or execute code from `D:\dingding\daka`.

Personal reminder settings are opt-in and stored in the plugin database. The desktop can perform one startup inspection per account and attendance date, generate sanitized reminder events, use PET when its public reminder capability is available, and fall back to a desktop notification or the plugin status area. Reminder delivery is deduplicated for six hours. Personal reminders never use the employee or management DingTalk Webhook. ISO timestamps received from Node are converted from their declared timezone to the machine's local timezone before expiration checks, so UTC `Z` values are handled correctly on China-time desktops.

The personal view has its own account selector and a one-row roster editor for the employee bound to that account. It cannot browse or modify other employees. Personal synchronization and its immediate/scheduled execution still require the secured management login because the upstream iEPMS API is available only through a management session; after retrieval, records are filtered to the selected personal account. Personal runs never invoke DingTalk alert delivery. Completion and failure messages are retained in the local run state and displayed only inside the plugin.

The packaged default iEPMS account and password are held as an authenticated encrypted payload and are initialized only when no account has been configured locally. User-supplied settings take priority and are never overwritten. The account is retained in the local runtime configuration; passwords are protected with Windows DPAPI in the plugin-owned SQLite database. Legacy plaintext password rows migrate on their next read. Credentials are never returned to DSH, rendered by the browser, or written to logs. Because a packaged default must also carry its decryption material, it protects against accidental plaintext exposure rather than against a user who can inspect the installed plugin files. Per-employee Webhook values are also stored locally in SQLite but are never echoed to the browser; the roster editor receives only a configured/not-configured flag. The plugin API returns only sanitized roster data and masked account identifiers.

When a local `last_attendance_data.json` exists, opening the personal view stores a derived local history cache in SQLite. The cache is account-scoped by a SHA-256 identifier and contains only date, clock-in/out time, work duration and normalized status. It contains no employee name, project, mobile number, DingTalk ID, password, Webhook or raw account value.

The personal view also provides a local make-up punch register for records identified as `缺卡`. A standard request can be created through the end of the third calendar day (for example, a Monday missed punch remains eligible until Wednesday 23:59:59). Once that window has passed, the register accepts only an overtime make-up request with a past non-working date. Non-working-day validation uses the existing `chinese-calendar` backend dependency, with a weekend-only fallback if that dependency is unavailable. Requests are stored account-scoped in `personal_makeup_requests` with status `local-pending`; no iEPMS make-up request is sent until a verified upstream submission interface is integrated.

The package intentionally uses Cordis and Schemastery from the DSH host runtime. It must be installed into a DSH Desktop profile, not run as a standalone Node application.

On first use, the plugin creates a private Python virtual environment under its own data directory and automatically installs missing dependencies there. It uses the Aliyun HTTPS Python mirror by default and falls back to the official PyPI index, so users do not need to run `pip install` or manage a virtual environment. A usable system Python runtime is still required; shipping that interpreter inside the DSH Desktop installer is a separate desktop-distribution concern.

## Development

```powershell
cd D:\work\dsh\iepms-attendance-plugin
npm install
npm test
npm run pack:check
```

The bundled Python bridge can be tested without any network activity:

```powershell
$env:IEPMS_PLUGIN_DATA_ROOT="$env:TEMP\iepms-attendance-plugin-test"
'{"version":1,"command":"status"}' | python .\backend\iepms_bridge.py
```

The packaged Python dependencies are listed in `backend/requirements.txt`. `legacyImportRoot` is optional and only imports existing data once; it is never used as a runtime module path.

See `DEVELOPMENT_PLAN.md` for the staged implementation plan.
