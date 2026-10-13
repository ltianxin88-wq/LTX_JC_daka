# iEPMS Attendance Monitor Plugin

`iepms-attendance-plugin` adds a local attendance-monitoring and secure configuration panel to DeepSeek Harness.

Version 0.3 provides two switchable views. The management view reads sanitized health, roster aggregate, schedule state and recent status from `D:\dingding\daka`, and can update the local iEPMS account, browser channel, overnight-attendance policy and DingTalk Webhook from an explicit user form. The personal view has its own single-field account setting, independent from the management login, and uses it only to filter the latest local result before presenting daily status, a monthly calendar, monthly statistics and recent punches. Saving settings or switching views does not run login, attendance checks, task changes, exports or DingTalk delivery.

Passwords remain in Windows Credential Manager / DPAPI and are never written to `config.json` or returned to DSH. Webhook values are written to the existing local configuration for backward compatibility but are never echoed to the browser. The plugin API returns only configured/not-configured state and a masked account identifier.

When a local `last_attendance_data.json` exists, opening the personal view stores a derived local history cache at `D:\dingding\daka\.personal_attendance_history.json`. The cache is account-scoped by a SHA-256 identifier and contains only date, clock-in/out time, work duration and normalized status. It contains no employee name, project, mobile number, DingTalk ID, password, Webhook or raw account value.

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
