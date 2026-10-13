# iEPMS Attendance Monitor Plugin

`iepms-attendance-plugin` adds a local, read-only attendance-monitoring panel to DeepSeek Harness.

The initial release reads sanitized health, roster aggregate, schedule state and recent status from `D:\dingding\daka`. It does not run login, attendance checks, task changes, exports or DingTalk delivery. Passwords remain in Windows Credential Manager and are never returned to DSH.

The package intentionally uses Cordis and Schemastery from the DSH host runtime. It must be installed into a DSH Desktop profile, not run as a standalone Node application.

## Development

```powershell
cd D:\work\dsh\iepms-attendance-plugin
npm install
npm test
npm run pack:check
```

The Python bridge can be tested without any network activity:

```powershell
'{"version":1,"command":"status"}' | python D:\dingding\daka\iepms_bridge.py
```

See `DEVELOPMENT_PLAN.md` for the staged implementation plan.
