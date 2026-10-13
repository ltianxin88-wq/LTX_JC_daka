# iEPMS Attendance Monitor Plugin

`iepms-attendance-plugin` adds a local attendance-monitoring and secure configuration panel to DeepSeek Harness.

Version 0.2 reads sanitized health, roster aggregate, schedule state and recent status from `D:\dingding\daka`. It can also update the local iEPMS account, browser channel, overnight-attendance policy and DingTalk Webhook from an explicit user form. Saving settings does not run login, attendance checks, task changes, exports or DingTalk delivery.

Passwords remain in Windows Credential Manager / DPAPI and are never written to `config.json` or returned to DSH. Webhook values are written to the existing local configuration for backward compatibility but are never echoed to the browser. The plugin API returns only configured/not-configured state and a masked account identifier.

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
