window.__ModuleLoader__.load({ id: "iepms-attendance-plugin", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.tsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/contracts.ts
var PLUGIN_ID = "iepms-attendance-plugin";
var API_PREFIX = "/iepms-attendance-local/v1";
var CLIENT_HEADER = "x-iepms-attendance-client";
var CLIENT_NAME = "dashboard-web";

// src/workspace-ownership.ts
var EVENT = "iepms-attendance-plugin/workspace-activate";
function activatePluginWorkspace(pluginId) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { pluginId } }));
}
function observePluginWorkspace(pluginId, close) {
  const listener = (event) => {
    if (event.detail?.pluginId !== pluginId) close();
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

// src/client.css
var client_default = ".iepms-attendance-workspace { min-height: 100%; box-sizing: border-box; background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #202124); }\n.iepms-attendance-header { height: 62px; padding: 0 24px; border-bottom: 1px solid var(--dsw-alias-border-secondary, rgba(0,0,0,.1)); display:flex; align-items:center; justify-content:space-between; }\n.iepms-attendance-header > div { display:flex; gap:10px; align-items:center; min-width:0; }.iepms-attendance-header h1,.iepms-attendance-header p { margin:0; }.iepms-attendance-header h1 { font-size:16px; line-height:21px; font-weight:650; letter-spacing:0; }.iepms-attendance-header p { font-size:12px; line-height:18px; color:var(--dsw-alias-label-secondary,#6b7280); }\n.iepms-attendance-back,.iepms-attendance-refresh { width:32px; height:32px; padding:0; border:0; background:transparent; color:inherit; display:grid; place-items:center; border-radius:6px; cursor:pointer; }.iepms-attendance-back:hover,.iepms-attendance-refresh:hover { background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06)); }.iepms-attendance-refresh:disabled { opacity:.45; cursor:default; }\n.iepms-attendance-header-actions { display:flex; align-items:center; gap:8px; }.iepms-attendance-view-switch { padding:3px; display:flex; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.035)); }.iepms-attendance-view-switch button { min-width:62px; height:27px; padding:0 10px; border:0; border-radius:4px; background:transparent; color:var(--dsw-alias-label-secondary,#6b7280); font:inherit; font-size:12px; cursor:pointer; }.iepms-attendance-view-switch button.is-active { background:var(--dsw-alias-bg-layer-1,#fff); color:#147be8; font-weight:650; box-shadow:0 1px 3px rgba(24,78,130,.1); }.iepms-attendance-view-switch button:active { transform:translateY(1px); }\n.iepms-attendance-trigger { height:34px; margin:4px 0; padding:6px 10px; display:flex; align-items:center; gap:8px; border:0; border-radius:6px; background:transparent; color:var(--dsw-alias-label-primary,#202124); font:inherit; font-size:14px; line-height:20px; cursor:pointer; }.iepms-attendance-trigger:hover,.iepms-attendance-trigger.is-active { background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06)); }.iepms-attendance-trigger.is-rail { width:36px; height:36px; margin:7px 0 3px; padding:0; justify-content:center; }\n.iepms-attendance-content { width:min(1180px,100%); margin:0 auto; padding:24px; box-sizing:border-box; display:grid; gap:18px; }.iepms-attendance-mode { min-height:40px; padding:0 12px; display:flex; align-items:center; gap:8px; border-left:3px solid #1389a9; background:var(--dsw-alias-bg-layer-2,rgba(19,137,169,.06)); color:var(--dsw-alias-label-primary,#202124); font-size:13px; }.iepms-attendance-mode > span { font-weight:650; }.iepms-attendance-mode p { margin:0; color:var(--dsw-alias-label-secondary,#6b7280); }\n.iepms-attendance-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }.iepms-attendance-metric { min-height:108px; padding:15px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); box-sizing:border-box; display:grid; align-content:start; gap:5px; }.iepms-attendance-metric p,.iepms-attendance-metric span { margin:0; font-size:12px; color:var(--dsw-alias-label-secondary,#6b7280); }.iepms-attendance-metric strong { font-size:22px; line-height:29px; letter-spacing:0; }.iepms-attendance-metric .is-good,.iepms-attendance-readiness .is-ready { color:#17803d; }.iepms-attendance-metric .is-warning,.iepms-attendance-readiness .is-missing { color:#a55d00; }\n.iepms-attendance-columns { display:grid; grid-template-columns:1.2fr .8fr; gap:12px; }.iepms-attendance-section { min-width:0; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); }.iepms-attendance-section > header { height:42px; padding:0 14px; display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); }.iepms-attendance-section h2 { margin:0; font-size:13px; line-height:18px; font-weight:650; }\n.iepms-attendance-events,.iepms-attendance-tasks,.iepms-attendance-readiness ul { margin:0; padding:0; list-style:none; }.iepms-attendance-events li { min-height:38px; padding:0 14px; display:grid; grid-template-columns:148px 1fr; gap:12px; align-items:center; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); font-size:13px; }.iepms-attendance-events li:last-child,.iepms-attendance-tasks li:last-child { border-bottom:0; }.iepms-attendance-events time { color:var(--dsw-alias-label-secondary,#6b7280); font-variant-numeric:tabular-nums; }.iepms-attendance-events .is-error span { color:#c13030; }.iepms-attendance-events .is-warning span { color:#a55d00; }\n.iepms-attendance-tasks li,.iepms-attendance-readiness li { min-height:42px; padding:0 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); font-size:13px; }.iepms-attendance-tasks strong,.iepms-attendance-readiness strong { font-size:12px; font-weight:600; }.iepms-attendance-tasks .is-ready { color:#17803d; }.iepms-attendance-tasks .is-running { color:#1389a9; }.iepms-attendance-tasks .is-disabled { color:#a55d00; }.iepms-attendance-empty { padding:16px 14px; margin:0; color:var(--dsw-alias-label-secondary,#6b7280); font-size:13px; }.iepms-attendance-state { max-width:520px; margin:56px auto; padding:20px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; }.iepms-attendance-state h2,.iepms-attendance-state p { margin:0; }.iepms-attendance-state h2 { font-size:16px; }.iepms-attendance-state p { margin-top:7px; color:var(--dsw-alias-label-secondary,#6b7280); font-size:13px; }.iepms-attendance-state button { margin-top:14px; min-height:30px; padding:5px 11px; border:0; border-radius:5px; background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.08)); color:inherit; font:inherit; cursor:pointer; }\n.iepms-attendance-config > header span { margin-left:auto; font-size:12px; color:var(--dsw-alias-label-secondary,#6b7280); }.iepms-attendance-config form { padding:16px 14px; }.iepms-attendance-config-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }.iepms-attendance-config-grid label { display:grid; gap:6px; font-size:12px; color:var(--dsw-alias-label-secondary,#6b7280); }.iepms-attendance-config input,.iepms-attendance-config select { width:100%; height:34px; box-sizing:border-box; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.14)); border-radius:5px; padding:0 10px; background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-primary,#202124); font:inherit; font-size:13px; outline:none; }.iepms-attendance-config input:focus,.iepms-attendance-config select:focus { border-color:#1389a9; box-shadow:0 0 0 2px rgba(19,137,169,.12); }.iepms-attendance-config input:disabled { opacity:.55; }.iepms-attendance-config-options { display:flex; flex-wrap:wrap; gap:18px; margin-top:15px; }.iepms-attendance-config-options label { display:flex; align-items:center; gap:7px; font-size:13px; cursor:pointer; }.iepms-attendance-config-options input { width:15px; height:15px; padding:0; accent-color:#1389a9; }.iepms-attendance-config-actions { margin-top:16px; display:flex; align-items:center; justify-content:space-between; gap:18px; }.iepms-attendance-config-actions p { margin:0; font-size:12px; color:var(--dsw-alias-label-secondary,#6b7280); }.iepms-attendance-config-actions button { flex:none; min-width:92px; min-height:34px; padding:6px 14px; border:0; border-radius:5px; background:#1389a9; color:#fff; font:inherit; font-size:13px; font-weight:600; cursor:pointer; }.iepms-attendance-config-actions button:hover { background:#0f7895; }.iepms-attendance-config-actions button:disabled { opacity:.55; cursor:default; }.iepms-attendance-config-message { margin:12px 0 0; padding:8px 10px; border-radius:4px; font-size:12px; }.iepms-attendance-config-message.is-success { background:rgba(23,128,61,.09); color:#17803d; }.iepms-attendance-config-message.is-error { background:rgba(193,48,48,.08); color:#b52b2b; }\n.iepms-personal-content { width:min(1240px,100%); margin:0 auto; padding:18px 20px 24px; box-sizing:border-box; display:grid; gap:14px; }.iepms-personal-notice { min-height:36px; padding:0 12px; display:flex; align-items:center; gap:8px; border:1px solid rgba(20,123,232,.18); border-radius:6px; background:rgba(20,123,232,.055); color:var(--dsw-alias-label-secondary,#5f6b7a); font-size:12px; }.iepms-personal-notice.is-warning { border-color:rgba(229,107,16,.22); background:rgba(229,107,16,.055); }.iepms-personal-notice button { margin-left:auto; min-height:27px; padding:3px 10px; border:1px solid rgba(20,123,232,.25); border-radius:5px; background:var(--dsw-alias-bg-layer-1,#fff); color:#147be8; font:inherit; font-size:12px; cursor:pointer; }.iepms-personal-notice button:active { transform:translateY(1px); }.iepms-personal-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }.iepms-personal-metric { min-height:105px; padding:13px 15px; display:flex; flex-direction:column; justify-content:center; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); }.iepms-personal-metric > div { display:flex; align-items:center; gap:8px; }.iepms-personal-metric > div > span { width:27px; height:27px; display:grid; place-items:center; border-radius:5px; background:rgba(20,123,232,.08); color:#147be8; }.iepms-personal-metric p,.iepms-personal-metric small { margin:0; color:var(--dsw-alias-label-secondary,#6b7280); font-size:12px; }.iepms-personal-metric strong { margin-top:6px; font-size:23px; line-height:28px; font-variant-numeric:tabular-nums; }.iepms-personal-metric.is-green strong { color:#159447; }.iepms-personal-metric.is-blue strong { color:#147be8; }.iepms-personal-metric.is-orange strong { color:#e56b10; }.iepms-personal-metric.is-muted strong { color:var(--dsw-alias-label-primary,#202124); }.iepms-personal-metric small { margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n.iepms-personal-grid { display:grid; grid-template-columns:1.08fr .92fr; gap:12px; }.iepms-personal-card { min-width:0; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); }.iepms-personal-card > header { min-height:42px; padding:0 13px; display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); }.iepms-personal-card > header h2 { margin:0; font-size:13px; font-weight:650; }.iepms-personal-card > header > span:first-child { display:flex; align-items:center; gap:8px; }.iepms-personal-calendar > header { justify-content:space-between; }.iepms-personal-calendar > header > div { display:flex; align-items:center; gap:5px; }.iepms-personal-calendar > header button { width:27px; height:27px; padding:0; border:0; border-radius:5px; display:grid; place-items:center; background:transparent; color:inherit; cursor:pointer; }.iepms-personal-calendar > header button:hover { background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06)); }.iepms-personal-calendar > header button:disabled { opacity:.3; cursor:default; }.iepms-personal-calendar > header strong { min-width:76px; text-align:center; font-size:12px; font-weight:600; }.iepms-calendar-weekdays,.iepms-calendar-days { display:grid; grid-template-columns:repeat(7,1fr); }.iepms-calendar-weekdays { margin:10px 12px 0; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; text-align:center; }.iepms-calendar-weekdays span { padding:5px 0; }.iepms-calendar-days { margin:0 12px; border-top:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); border-left:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); }.iepms-calendar-day { min-height:42px; padding:6px; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; gap:6px; border-right:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); color:var(--dsw-alias-label-primary,#202124); font-size:11px; }.iepms-calendar-day.is-outside { color:var(--dsw-alias-label-tertiary,#a1a8b3); background:rgba(127,139,152,.025); }.iepms-calendar-day.is-today { box-shadow:inset 0 0 0 1.5px #147be8; background:rgba(20,123,232,.04); }.iepms-calendar-day i,.iepms-calendar-legend i { width:7px; height:7px; border-radius:50%; background:#aab2bd; }.iepms-calendar-day i.is-normal,.iepms-calendar-day i.is-checked-in,.iepms-calendar-legend i.is-normal { background:#1ab55c; }.iepms-calendar-day i.is-late,.iepms-calendar-day i.is-early,.iepms-calendar-legend i.is-late { background:#f38a2e; }.iepms-calendar-day i.is-missing,.iepms-calendar-legend i.is-missing { background:#df4747; }.iepms-calendar-day i.is-pending,.iepms-calendar-legend i.is-pending { background:#9ca6b4; }.iepms-calendar-legend { min-height:38px; padding:0 14px; display:flex; align-items:center; gap:16px; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-calendar-legend span { display:flex; align-items:center; gap:5px; }\n.iepms-personal-stats { padding-bottom:4px; }.iepms-stat-row { min-height:45px; padding:0 14px; display:grid; grid-template-columns:72px 54px minmax(80px,1fr) 40px; align-items:center; gap:10px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.065)); font-size:12px; }.iepms-stat-row:last-child { border-bottom:0; }.iepms-stat-row > strong { color:#147be8; font-size:13px; }.iepms-stat-row > div { height:8px; overflow:hidden; border-radius:4px; background:rgba(127,139,152,.13); }.iepms-stat-row > div i { display:block; height:100%; border-radius:inherit; background:#3a9af3; }.iepms-stat-row small { color:var(--dsw-alias-label-secondary,#6b7280); text-align:right; font-size:11px; }.iepms-stat-row.is-green > strong { color:#159447; }.iepms-stat-row.is-green > div i { background:#22ad60; }.iepms-stat-row.is-orange > strong { color:#e56b10; }.iepms-stat-row.is-orange > div i { background:#f59742; }.iepms-stat-row.is-red > strong { color:#d63f3f; }.iepms-stat-row.is-red > div i { background:#df5a5a; }\n.iepms-personal-records > header > span { margin-left:auto; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-personal-table-wrap { overflow-x:auto; padding:8px 12px 12px; }.iepms-personal-table-wrap table { width:100%; border-collapse:separate; border-spacing:0; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.09)); border-radius:5px; overflow:hidden; font-size:12px; font-variant-numeric:tabular-nums; }.iepms-personal-table-wrap th { height:30px; padding:0 12px; text-align:left; color:var(--dsw-alias-label-secondary,#6b7280); background:rgba(127,139,152,.055); font-weight:550; }.iepms-personal-table-wrap td { height:30px; padding:0 12px; border-top:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.07)); }.iepms-personal-table-wrap td strong { font-size:11px; }.iepms-personal-table-wrap td strong.is-normal,.iepms-personal-table-wrap td strong.is-checked-in { color:#159447; }.iepms-personal-table-wrap td strong.is-late,.iepms-personal-table-wrap td strong.is-early { color:#e56b10; }.iepms-personal-table-wrap td strong.is-missing { color:#d63f3f; }.iepms-personal-table-wrap td strong.is-pending { color:#7b8491; }.iepms-personal-empty { max-width:520px; margin:64px auto; padding:28px; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; text-align:center; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; }.iepms-personal-empty h2 { margin:10px 0 0; font-size:16px; }.iepms-personal-empty p { margin:7px 0 0; color:var(--dsw-alias-label-secondary,#6b7280); font-size:13px; }.iepms-personal-empty button { margin-top:16px; min-height:34px; padding:6px 14px; border:0; border-radius:5px; background:#147be8; color:#fff; font:inherit; font-size:13px; cursor:pointer; }.iepms-personal-empty button:active { transform:translateY(1px); }\n.iepms-personal-skeleton { min-height:105px; border-radius:6px; background:linear-gradient(90deg,rgba(127,139,152,.08),rgba(127,139,152,.16),rgba(127,139,152,.08)); background-size:200% 100%; animation:iepms-skeleton 1.25s ease-in-out infinite; }.iepms-personal-skeleton.is-large { min-height:330px; }.iepms-personal-skeleton.is-table { min-height:190px; }@keyframes iepms-skeleton { from { background-position:100% 0; } to { background-position:-100% 0; } }@media (prefers-reduced-motion:reduce) { .iepms-personal-skeleton { animation:none; } }\n@media (max-width: 760px) { .iepms-attendance-header { padding:0 14px; }.iepms-attendance-content { padding:14px; }.iepms-attendance-summary,.iepms-attendance-columns { grid-template-columns:1fr; }.iepms-attendance-mode { align-items:flex-start; padding:10px 12px; flex-wrap:wrap; }.iepms-attendance-mode p { flex-basis:100%; margin-left:23px; }.iepms-attendance-events li { grid-template-columns:1fr; gap:1px; padding:8px 14px; } }\n@media (max-width: 900px) { .iepms-personal-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); }.iepms-personal-grid { grid-template-columns:1fr; } }\n@media (max-width: 760px) { .iepms-attendance-header { height:auto; min-height:62px; padding-top:8px; padding-bottom:8px; gap:8px; }.iepms-attendance-header > div:first-child > span p { display:none; }.iepms-attendance-view-switch button { min-width:54px; padding:0 7px; }.iepms-attendance-config-grid { grid-template-columns:1fr; }.iepms-attendance-config-actions { align-items:flex-start; flex-direction:column; }.iepms-attendance-config-actions button { width:100%; }.iepms-personal-content { padding:14px; }.iepms-personal-metrics { grid-template-columns:1fr; }.iepms-personal-metric { min-height:94px; }.iepms-calendar-day { min-height:38px; padding:5px 2px; }.iepms-calendar-legend { flex-wrap:wrap; padding:8px 12px; }.iepms-stat-row { grid-template-columns:64px 50px minmax(60px,1fr) 34px; gap:7px; padding:0 10px; }.iepms-personal-records > header > span { display:none; } }\n";

// src/client.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var STYLE_ID = `${PLUGIN_ID}/client`;
var ATTENDANCE_PANEL_ID = "iepms-attendance-panel";
var inject = ["slots"];
function apply(ctx) {
  ctx.effect(installStyles, "iepms-attendance-plugin: client styles");
  const workspace = createWorkspaceController(ctx);
  ctx.effect(() => observePluginWorkspace(PLUGIN_ID, workspace.close), "iepms-attendance-plugin: exclusive workspace");
  ctx.effect(() => () => {
    workspace.close();
  }, "iepms-attendance-plugin: workspace lifecycle");
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action",
    id: "iepms-attendance",
    order: -9
  }, (props) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttendanceLauncher, { ...props, workspace })));
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: ATTENDANCE_PANEL_ID,
    order: -9,
    label: () => "\u8003\u52E4\u76D1\u63A7"
  }, ({ size }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconAlarmClockOutlineRegular, { size })));
  ctx.slots.inject("main", () => ctx.slots.register({
    name: "main",
    key: ATTENDANCE_PANEL_ID
  }, () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttendancePanel, {})));
}
function createWorkspaceController(client) {
  const listeners = /* @__PURE__ */ new Set();
  let disposeWorkspace;
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const close = () => {
    if (disposeWorkspace === void 0) return;
    const dispose = disposeWorkspace;
    disposeWorkspace = void 0;
    dispose();
    notify();
  };
  const controller = {
    isOpen: () => disposeWorkspace !== void 0,
    toggle: () => {
      if (disposeWorkspace !== void 0) return close();
      activatePluginWorkspace(PLUGIN_ID);
      disposeWorkspace = client.slots.register({ name: "main.conversation", priority: -1 }, (props) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttendanceWorkspace, { ...props, workspace: controller }));
      notify();
    },
    close,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
  return controller;
}
function AttendanceLauncher({ wide, workspace }) {
  const [open, setOpen] = (0, import_react.useState)(workspace.isOpen());
  (0, import_react.useEffect)(() => workspace.subscribe(() => {
    setOpen(workspace.isOpen());
  }), [workspace]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "button",
    {
      type: "button",
      className: `iepms-attendance-trigger${wide ? "" : " is-rail"}${open ? " is-active" : ""}`,
      "aria-label": open ? "\u8FD4\u56DE\u5BF9\u8BDD" : "\u8003\u52E4\u76D1\u63A7",
      "aria-pressed": open,
      title: wide ? void 0 : open ? "\u8FD4\u56DE\u5BF9\u8BDD" : "\u8003\u52E4\u76D1\u63A7",
      onClick: workspace.toggle,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconAlarmClockOutlineRegular, { size: wide ? 16 : 18 }),
        wide && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: open ? "\u8FD4\u56DE\u5BF9\u8BDD" : "\u8003\u52E4\u76D1\u63A7" })
      ]
    }
  );
}
function AttendanceWorkspace({ workspace }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttendancePanel, { workspace });
}
function AttendancePanel({ workspace }) {
  const [view, setView] = (0, import_react.useState)("management");
  const [state, setState] = (0, import_react.useState)("loading");
  const [snapshot, setSnapshot] = (0, import_react.useState)();
  const [configuration, setConfiguration] = (0, import_react.useState)();
  const [error, setError] = (0, import_react.useState)("");
  const [personalState, setPersonalState] = (0, import_react.useState)("idle");
  const [personal, setPersonal] = (0, import_react.useState)();
  const [personalError, setPersonalError] = (0, import_react.useState)("");
  const load = (0, import_react.useCallback)(async (background = false) => {
    if (!background) setState("loading");
    setError("");
    try {
      const [nextSnapshot, nextConfiguration] = await Promise.all([
        requestApi("snapshot"),
        requestApi("configuration")
      ]);
      if (!isSnapshot(nextSnapshot) || !isConfiguration(nextConfiguration)) throw new Error("\u8003\u52E4\u72B6\u6001\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      setSnapshot(nextSnapshot);
      setConfiguration(nextConfiguration);
      setState("ready");
    } catch (value) {
      setState("error");
      setError(value instanceof Error ? value.message : "\u8003\u52E4\u72B6\u6001\u8BFB\u53D6\u5931\u8D25\u3002");
    }
  }, []);
  (0, import_react.useEffect)(() => {
    void load();
  }, [load]);
  const loadPersonal = (0, import_react.useCallback)(async () => {
    setPersonalState("loading");
    setPersonalError("");
    try {
      const next = await requestApi("personal-attendance");
      if (!isPersonalAttendance(next)) throw new Error("\u4E2A\u4EBA\u8003\u52E4\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      setPersonal(next);
      setPersonalState("ready");
    } catch (value) {
      setPersonalState("error");
      setPersonalError(value instanceof Error ? value.message : "\u4E2A\u4EBA\u8003\u52E4\u8BFB\u53D6\u5931\u8D25\u3002");
    }
  }, []);
  (0, import_react.useEffect)(() => {
    if (view === "personal" && personalState === "idle") void loadPersonal();
  }, [loadPersonal, personalState, view]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-attendance-workspace", "aria-labelledby": "iepms-attendance-title", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "iepms-attendance-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        workspace !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "iepms-attendance-back", onClick: workspace.close, "aria-label": "\u8FD4\u56DE\u5BF9\u8BDD", title: "\u8FD4\u56DE\u5BF9\u8BDD", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronLeftOutlineRegular, { size: 16 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconAlarmClockOutlineRegular, { size: 20 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { id: "iepms-attendance-title", children: "\u8003\u52E4\u76D1\u63A7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: view === "management" ? "\u7BA1\u7406\u7248 \xB7 \u672C\u5730\u8FD0\u884C\u72B6\u6001\u4E0E\u914D\u7F6E" : "\u4E2A\u4EBA\u7248 \xB7 \u6211\u7684\u51FA\u52E4\u8BB0\u5F55" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-header-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-view-switch", role: "tablist", "aria-label": "\u8003\u52E4\u89C6\u56FE", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", role: "tab", "aria-selected": view === "management", className: view === "management" ? "is-active" : "", onClick: () => {
            setView("management");
          }, children: "\u7BA1\u7406\u7248" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", role: "tab", "aria-selected": view === "personal", className: view === "personal" ? "is-active" : "", onClick: () => {
            setView("personal");
          }, children: "\u4E2A\u4EBA\u7248" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "iepms-attendance-refresh", onClick: () => {
          void (view === "management" ? load() : loadPersonal());
        }, disabled: view === "management" ? state === "loading" : personalState === "loading", title: "\u5237\u65B0\u72B6\u6001", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconInspectOutlineRegular, { size: 16 }) })
      ] })
    ] }),
    view === "management" && state === "loading" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelState, { title: "\u6B63\u5728\u8BFB\u53D6\u672C\u5730\u72B6\u6001", text: "\u4E0D\u4F1A\u767B\u5F55 iEPMS\uFF0C\u4E5F\u4E0D\u4F1A\u53D1\u9001\u901A\u77E5\u3002" }),
    view === "management" && state === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelState, { title: "\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u8003\u52E4\u72B6\u6001", text: error, retry: () => {
      void load();
    } }),
    view === "management" && state === "ready" && snapshot !== void 0 && configuration !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Dashboard,
      {
        snapshot,
        configuration,
        onConfigurationSaved: (next) => {
          setConfiguration(next);
          void load(true);
        }
      }
    ),
    view === "personal" && (personalState === "idle" || personalState === "loading") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonalSkeleton, {}),
    view === "personal" && personalState === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelState, { title: "\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u4E2A\u4EBA\u8003\u52E4", text: personalError, retry: () => {
      void loadPersonal();
    } }),
    view === "personal" && personalState === "ready" && personal !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonalDashboard, { value: personal, openSettings: () => {
      setView("management");
    } })
  ] });
}
function Dashboard({ snapshot, configuration, onConfigurationSaved }) {
  const statusConfig = snapshot.status.configuration;
  const data = snapshot.status.data;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-content", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-mode", role: "status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconDataOutlineRegular, { size: 15 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u5B89\u5168\u6A21\u5F0F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u4EC5\u5728\u4F60\u70B9\u51FB\u4FDD\u5B58\u65F6\u66F4\u65B0\u672C\u5730\u914D\u7F6E\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u767B\u5F55\u3001\u5DE1\u68C0\u3001\u5BFC\u51FA\u6216\u53D1\u9001\u9489\u9489\u6D88\u606F\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-attendance-summary", "aria-label": "\u8FD0\u884C\u6982\u89C8", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, { label: "\u540E\u7AEF\u72B6\u6001", value: snapshot.status.application.backendRootAvailable ? "\u53EF\u7528" : "\u4E0D\u53EF\u7528", detail: `${snapshot.status.application.name} ${snapshot.status.application.version}`, good: snapshot.status.application.backendRootAvailable }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, { label: "\u82B1\u540D\u518C", value: data.rosterAvailable ? `${snapshot.roster.personCount} \u4EBA` : "\u672A\u627E\u5230", detail: data.rosterAvailable ? `${snapshot.roster.projectCount} \u4E2A\u9879\u76EE` : "\u8BF7\u68C0\u67E5\u672C\u5730 roster.xlsx", good: data.rosterAvailable }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, { label: "\u8BA1\u5212\u4EFB\u52A1", value: `${snapshot.schedule.tasks.length} \u9879`, detail: snapshot.schedule.message ?? "\u5DF2\u8BFB\u53D6\u672C\u5730 Windows \u8BA1\u5212\u4EFB\u52A1", good: snapshot.schedule.supported }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, { label: "\u914D\u7F6E\u72B6\u6001", value: statusConfig.valid ? "\u5DF2\u8BFB\u53D6" : "\u9700\u68C0\u67E5", detail: `${statusConfig.accountConfigured ? "\u8D26\u53F7\u5DF2\u914D\u7F6E" : "\u8D26\u53F7\u672A\u914D\u7F6E"} \xB7 ${statusConfig.browserConfigured ? "\u6D4F\u89C8\u5668\u5DF2\u914D\u7F6E" : "\u6D4F\u89C8\u5668\u672A\u914D\u7F6E"}`, good: statusConfig.valid && statusConfig.accountConfigured })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-columns", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-attendance-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconClockOutlineRegular, { size: 16 }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u8FD1\u671F\u72B6\u6001" })
        ] }),
        snapshot.recentRuns.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { text: "\u5C1A\u65E0\u53EF\u5C55\u793A\u7684\u672C\u5730\u8FD0\u884C\u6458\u8981\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", { className: "iepms-attendance-events", children: snapshot.recentRuns.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: `is-${item.level}`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { children: item.timestamp }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.summary })
        ] }, `${item.timestamp}-${index}`)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-attendance-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconAlarmClockOutlineRegular, { size: 16 }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u8BA1\u5212\u4EFB\u52A1" })
        ] }),
        snapshot.schedule.tasks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { text: snapshot.schedule.message ?? "\u6CA1\u6709\u5DF2\u7BA1\u7406\u7684\u8BA1\u5212\u4EFB\u52A1\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "iepms-attendance-tasks", children: snapshot.schedule.tasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: task.name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { className: `is-${task.state}`, children: taskStateLabel(task.state) })
        ] }, task.name)) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfigurationEditor, { value: configuration, onSaved: onConfigurationSaved }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-attendance-section iepms-attendance-readiness", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconInspectOutlineRegular, { size: 16 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u672C\u5730\u51C6\u5907\u72B6\u6001" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readiness, { label: "\u914D\u7F6E\u6587\u4EF6", ready: statusConfig.fileAvailable && statusConfig.valid }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readiness, { label: "\u672C\u5730\u8D26\u53F7\u914D\u7F6E", ready: statusConfig.accountConfigured }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readiness, { label: "\u901A\u77E5\u914D\u7F6E", ready: statusConfig.webhookConfigured }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readiness, { label: "\u8FD0\u884C\u65E5\u5FD7", ready: data.logAvailable, missingLabel: "\u6682\u65E0\u6570\u636E" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readiness, { label: "\u6700\u8FD1\u5BFC\u51FA\u6570\u636E", ready: data.lastDataAvailable, missingLabel: "\u6682\u65E0\u6570\u636E" })
      ] })
    ] })
  ] });
}
function PersonalDashboard({ value, openSettings }) {
  const today = /* @__PURE__ */ new Date();
  const currentMonth = monthKey(today);
  const [selectedMonth, setSelectedMonth] = (0, import_react.useState)(currentMonth);
  const records = value.records.filter((record) => record.date.startsWith(`${selectedMonth}-`));
  const recordByDate = new Map(records.map((record) => [record.date, record]));
  const todayRecord = value.records.find((record) => record.date === dateKey(today));
  const attendanceDays = records.filter((record) => record.status !== "missing" && record.status !== "pending").length;
  const normalPunches = records.filter((record) => record.status === "normal" || record.status === "checked-in").reduce((total, record) => total + Number(Boolean(record.clockIn)) + Number(Boolean(record.clockOut)), 0);
  const late = records.filter((record) => record.status === "late").length;
  const early = records.filter((record) => record.status === "early").length;
  const missing = records.filter((record) => record.status === "missing").length;
  const expectedDays = expectedWorkdays(selectedMonth, currentMonth);
  const attendanceRate = expectedDays === 0 ? 0 : Math.min(100, Math.round(attendanceDays / expectedDays * 100));
  const anomalyCount = late + early + missing;
  const recent = [...value.records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-personal-content", children: [
    !value.configured ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-personal-notice is-warning", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconUserOutlineRegular, { size: 15 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u5C1A\u672A\u914D\u7F6E\u4E2A\u4EBA\u5DE5\u53F7\uFF0C\u5F53\u524D\u663E\u793A\u7A7A\u6570\u636E\u5E03\u5C40\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: openSettings, children: "\u524D\u5F80\u914D\u7F6E" })
    ] }) : !value.source.latestAvailable && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-personal-notice", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconDataOutlineRegular, { size: 15 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6682\u65E0\u4E2A\u4EBA\u8003\u52E4\u6570\u636E\u3002\u5B8C\u6210\u4E00\u6B21\u5DE1\u68C0\u540E\uFF0C\u4E2A\u4EBA\u7248\u4F1A\u4ECE\u672C\u5730\u7ED3\u679C\u4E2D\u6574\u7406\u8BB0\u5F55\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-personal-metrics", "aria-label": "\u4E2A\u4EBA\u8003\u52E4\u6982\u89C8", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonalMetric, { icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconAlarmClockOutlineRegular, { size: 17 }), label: "\u4ECA\u65E5\u72B6\u6001", value: todayRecord === void 0 ? "\u6682\u65E0\u8BB0\u5F55" : personalStatusLabel(todayRecord.status), detail: todayRecord === void 0 ? "\u7B49\u5F85\u672C\u5730\u5DE1\u68C0\u6570\u636E" : `\u4E0A\u73ED ${todayRecord.clockIn || "-"} / \u4E0B\u73ED ${todayRecord.clockOut || "-"}`, tone: statusTone(todayRecord?.status) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonalMetric, { icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconGaugeOutlineRegular, { size: 17 }), label: "\u672C\u6708\u51FA\u52E4", value: `${attendanceDays}\u5929`, detail: `\u5DE5\u4F5C\u65E5\u4F30\u7B97 ${expectedDays} \u5929`, tone: "blue" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonalMetric, { icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconCheckCircleOutlineRegular, { size: 17 }), label: "\u6B63\u5E38\u6253\u5361", value: `${normalPunches}\u6B21`, detail: `\u51FA\u52E4\u7387 ${attendanceRate}%`, tone: "green" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonalMetric, { icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconWarningTriangleOutlineRegular, { size: 17 }), label: "\u5F02\u5E38\u8BB0\u5F55", value: `${anomalyCount}\u6B21`, detail: `\u8FDF\u5230 ${late} \u6B21 \xB7 \u65E9\u9000 ${early} \u6B21 \xB7 \u7F3A\u5361 ${missing} \u6B21`, tone: anomalyCount > 0 ? "orange" : "muted" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-personal-grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-personal-card iepms-personal-calendar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconAlarmClockOutlineRegular, { size: 16 }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u6708\u5EA6\u6253\u5361\u65E5\u5386" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-label": "\u4E0A\u4E2A\u6708", onClick: () => {
              setSelectedMonth(shiftMonth(selectedMonth, -1));
            }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronLeftOutlineRegular, { size: 15 }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
              selectedMonth.replace("-", "\u5E74"),
              "\u6708"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-label": "\u4E0B\u4E2A\u6708", disabled: selectedMonth >= currentMonth, onClick: () => {
              setSelectedMonth(shiftMonth(selectedMonth, 1));
            }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 15 }) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "iepms-calendar-weekdays", "aria-hidden": "true", children: ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"].map((day) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: day }, day)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "iepms-calendar-days", children: calendarCells(selectedMonth).map((cell) => {
          const record = recordByDate.get(cell.date);
          const isToday = cell.date === dateKey(today);
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `iepms-calendar-day${cell.inMonth ? "" : " is-outside"}${isToday ? " is-today" : ""}`, title: record === void 0 ? cell.date : `${cell.date} ${personalStatusLabel(record.status)}`, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: cell.day }),
            record !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: `is-${record.status}`, "aria-label": personalStatusLabel(record.status) })
          ] }, cell.date);
        }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-calendar-legend", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "is-normal" }),
            "\u6B63\u5E38"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "is-late" }),
            "\u8FDF\u5230/\u65E9\u9000"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "is-missing" }),
            "\u7F3A\u5361"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "is-pending" }),
            "\u8FDB\u884C\u4E2D"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-personal-card iepms-personal-stats", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconGaugeOutlineRegular, { size: 16 }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u6708\u5EA6\u8003\u52E4\u7EDF\u8BA1" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatRow, { label: "\u51FA\u52E4\u5929\u6570", value: `${attendanceDays}\u5929`, amount: expectedDays === 0 ? 0 : attendanceDays / expectedDays, detail: `${attendanceDays} / ${expectedDays}`, tone: "blue" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatRow, { label: "\u6B63\u5E38\u6253\u5361", value: `${normalPunches}\u6B21`, amount: attendanceDays === 0 ? 0 : normalPunches / (attendanceDays * 2), detail: `${Math.round(attendanceDays === 0 ? 0 : normalPunches / (attendanceDays * 2) * 100)}%`, tone: "green" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatRow, { label: "\u8FDF\u5230", value: `${late}\u6B21`, amount: expectedDays === 0 ? 0 : late / expectedDays, detail: `${Math.round(expectedDays === 0 ? 0 : late / expectedDays * 100)}%`, tone: "orange" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatRow, { label: "\u65E9\u9000", value: `${early}\u6B21`, amount: expectedDays === 0 ? 0 : early / expectedDays, detail: `${Math.round(expectedDays === 0 ? 0 : early / expectedDays * 100)}%`, tone: "orange" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatRow, { label: "\u7F3A\u5361", value: `${missing}\u6B21`, amount: expectedDays === 0 ? 0 : missing / expectedDays, detail: `${Math.round(expectedDays === 0 ? 0 : missing / expectedDays * 100)}%`, tone: "red" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatRow, { label: "\u51FA\u52E4\u7387", value: `${attendanceRate}%`, amount: attendanceRate / 100, detail: `${attendanceRate}%`, tone: "blue" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-personal-card iepms-personal-records", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChecklistOutlineRegular, { size: 16 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u6700\u8FD1\u6253\u5361\u8BB0\u5F55" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: value.configured ? `\u8D26\u53F7 ${value.accountMasked}` : "\u5C1A\u672A\u914D\u7F6E\u8D26\u53F7" })
      ] }),
      recent.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { text: "\u6682\u65E0\u672C\u5730\u4E2A\u4EBA\u8BB0\u5F55\u3002\u5DE1\u68C0\u751F\u6210\u5F53\u65E5\u660E\u7EC6\u540E\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "iepms-personal-table-wrap", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u65E5\u671F" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u4E0A\u73ED\u65F6\u95F4" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u4E0B\u73ED\u65F6\u95F4" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u5DE5\u65F6" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u72B6\u6001" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: recent.map((record) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: record.date.slice(5) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: record.clockIn || "-" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: record.clockOut || "-" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: formatWorkMinutes(record.workMinutes) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { className: `is-${record.status}`, children: personalStatusLabel(record.status) }) })
        ] }, record.date)) })
      ] }) })
    ] })
  ] });
}
function PersonalMetric({ icon, label, value, detail, tone }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: `iepms-personal-metric is-${tone}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: icon }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: label })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: detail })
  ] });
}
function StatRow({ label, value, amount, detail, tone }) {
  const percent = Math.max(0, Math.min(100, Math.round(amount * 100)));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `iepms-stat-row is-${tone}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { role: "progressbar", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": percent, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${percent}%` } }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: detail })
  ] });
}
function PersonalSkeleton() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-personal-content is-loading", "aria-label": "\u6B63\u5728\u8BFB\u53D6\u4E2A\u4EBA\u8003\u52E4", "aria-busy": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "iepms-personal-metrics", children: [0, 1, 2, 3].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "iepms-personal-skeleton" }, item)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-personal-grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "iepms-personal-skeleton is-large" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "iepms-personal-skeleton is-large" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "iepms-personal-skeleton is-table" })
  ] });
}
function ConfigurationEditor({ value, onSaved }) {
  const [username, setUsername] = (0, import_react.useState)("");
  const [password, setPassword] = (0, import_react.useState)("");
  const [webhook, setWebhook] = (0, import_react.useState)("");
  const [clearWebhook, setClearWebhook] = (0, import_react.useState)(false);
  const [browserChannel, setBrowserChannel] = (0, import_react.useState)(value.browserChannel);
  const [overnightExempt, setOvernightExempt] = (0, import_react.useState)(value.overnightExemptAttendance);
  const [overnightHours, setOvernightHours] = (0, import_react.useState)(value.overnightCheckWorkHours);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [message, setMessage] = (0, import_react.useState)();
  (0, import_react.useEffect)(() => {
    setBrowserChannel(value.browserChannel);
    setOvernightExempt(value.overnightExemptAttendance);
    setOvernightHours(value.overnightCheckWorkHours);
  }, [value]);
  const save = async (event) => {
    event.preventDefault();
    const account = username.trim();
    if (!value.accountConfigured && !account) return setMessage({ kind: "error", text: "\u9996\u6B21\u914D\u7F6E\u9700\u8981\u586B\u5199 iEPMS \u5DE5\u53F7\u3002" });
    if (!value.passwordConfigured && !password) return setMessage({ kind: "error", text: "\u9996\u6B21\u914D\u7F6E\u9700\u8981\u586B\u5199 iEPMS \u5BC6\u7801\u3002" });
    const settings = {
      browserChannel,
      overnightExemptAttendance: overnightExempt,
      overnightCheckWorkHours: overnightHours
    };
    if (account) settings.username = account;
    if (password) settings.password = password;
    if (clearWebhook) settings.defaultWebhook = "";
    else if (webhook.trim()) settings.defaultWebhook = webhook.trim();
    setSaving(true);
    setMessage(void 0);
    try {
      const next = await requestApi("configuration", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (!isConfiguration(next)) throw new Error("\u914D\u7F6E\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      setUsername("");
      setPassword("");
      setWebhook("");
      setClearWebhook(false);
      setMessage({ kind: "success", text: "\u914D\u7F6E\u5DF2\u5B89\u5168\u4FDD\u5B58\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u89E6\u53D1\u767B\u5F55\u6216\u5DE1\u68C0\u3002" });
      onSaved(next);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "\u914D\u7F6E\u4FDD\u5B58\u5931\u8D25\u3002" });
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-attendance-section iepms-attendance-config", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconInspectOutlineRegular, { size: 16 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u672C\u5730\u914D\u7F6E" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u4FDD\u5B58\u540E\u4EC5\u66F4\u65B0\u672C\u5730\u8BBE\u7F6E" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: (event) => {
      void save(event);
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-config-grid", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "iEPMS \u5DE5\u53F7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { autoComplete: "username", value: username, onChange: (event) => {
            setUsername(event.target.value);
          }, placeholder: value.accountConfigured ? `\u5DF2\u914D\u7F6E\uFF1A${value.accountMasked}` : "\u8BF7\u8F93\u5165\u5DE5\u53F7" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "iEPMS \u5BC6\u7801" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", autoComplete: "new-password", value: password, onChange: (event) => {
            setPassword(event.target.value);
          }, placeholder: value.passwordConfigured ? "\u5DF2\u5B89\u5168\u4FDD\u5B58\uFF0C\u7559\u7A7A\u4E0D\u4FEE\u6539" : "\u8BF7\u8F93\u5165\u5BC6\u7801" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u9489\u9489 Webhook" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", autoComplete: "off", value: webhook, disabled: clearWebhook, onChange: (event) => {
            setWebhook(event.target.value);
          }, placeholder: value.webhookConfigured ? "\u5DF2\u914D\u7F6E\uFF0C\u7559\u7A7A\u4E0D\u4FEE\u6539" : "\u8BF7\u8F93\u5165 HTTPS Webhook" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6D4F\u89C8\u5668\u901A\u9053" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: browserChannel, onChange: (event) => {
            setBrowserChannel(event.target.value);
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "chrome", children: "Chrome" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "msedge", children: "Microsoft Edge" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "chromium", children: "Chromium" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-config-options", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: overnightExempt, onChange: (event) => {
            setOvernightExempt(event.target.checked);
          } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u591C\u73ED\u514D\u6253\u5361" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: overnightHours, onChange: (event) => {
            setOvernightHours(event.target.checked);
          } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u591C\u73ED\u68C0\u67E5\u5DE5\u65F6" })
        ] }),
        value.webhookConfigured && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: clearWebhook, onChange: (event) => {
            setClearWebhook(event.target.checked);
          } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6E05\u9664\u73B0\u6709 Webhook" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-config-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u5BC6\u7801\u5B58\u5165 Windows \u5B89\u5168\u51ED\u636E\uFF1B\u9875\u9762\u4E0E\u63A5\u53E3\u5747\u4E0D\u56DE\u663E\u5BC6\u7801\u6216 Webhook\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: saving, children: saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u914D\u7F6E" })
      ] }),
      message !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: `iepms-attendance-config-message is-${message.kind}`, role: message.kind === "error" ? "alert" : "status", children: message.text })
    ] })
  ] });
}
function Metric({ label, value, detail, good }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "iepms-attendance-metric", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { className: good ? "is-good" : "is-warning", children: value }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: detail })
  ] });
}
function Readiness({ label, ready, missingLabel = "\u5F85\u914D\u7F6E" }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { className: ready ? "is-ready" : "is-missing", children: ready ? "\u5DF2\u5C31\u7EEA" : missingLabel })
  ] });
}
function Empty({ text }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "iepms-attendance-empty", children: text });
}
function PanelState({ title, text, retry }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-state", role: retry === void 0 ? "status" : "alert", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: text }),
    retry !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: retry, children: "\u91CD\u8BD5" })
  ] });
}
function taskStateLabel(value) {
  return value === "ready" ? "\u5C31\u7EEA" : value === "running" ? "\u8FD0\u884C\u4E2D" : value === "disabled" ? "\u5DF2\u505C\u7528" : "\u672A\u77E5";
}
function isSnapshot(value) {
  return value !== null && typeof value === "object" && "status" in value && "roster" in value && "schedule" in value && "recentRuns" in value;
}
function isConfiguration(value) {
  return value !== null && typeof value === "object" && "accountConfigured" in value && "passwordConfigured" in value && "browserChannel" in value;
}
function isPersonalAttendance(value) {
  if (value === null || typeof value !== "object" || !("configured" in value) || !("records" in value)) return false;
  const record = value;
  return typeof record.configured === "boolean" && Array.isArray(record.records) && record.records.every((item) => item !== null && typeof item === "object" && typeof item.date === "string" && typeof item.status === "string");
}
function dateKey(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
function monthKey(value) {
  return dateKey(value).slice(0, 7);
}
function parseMonth(value) {
  const match = /^(\d{4})-(\d{2})$/u.exec(value);
  return match === null ? [(/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth() + 1] : [Number(match[1]), Number(match[2])];
}
function shiftMonth(value, amount) {
  const [year, month] = parseMonth(value);
  return monthKey(new Date(year, month - 1 + amount, 1));
}
function calendarCells(value) {
  const [year, month] = parseMonth(value);
  const first = new Date(year, month - 1, 1);
  const start = new Date(year, month - 1, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { date: dateKey(date), day: date.getDate(), inMonth: date.getMonth() === month - 1 };
  });
}
function expectedWorkdays(value, currentMonth) {
  if (value > currentMonth) return 0;
  const [year, month] = parseMonth(value);
  const finalDay = value === currentMonth ? (/* @__PURE__ */ new Date()).getDate() : new Date(year, month, 0).getDate();
  let count = 0;
  for (let day = 1; day <= finalDay; day += 1) {
    const weekday = new Date(year, month - 1, day).getDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}
function personalStatusLabel(value) {
  return value === "normal" ? "\u6B63\u5E38" : value === "late" ? "\u8FDF\u5230" : value === "early" ? "\u65E9\u9000" : value === "missing" ? "\u7F3A\u5361" : value === "checked-in" ? "\u5DF2\u6253\u5361" : "\u5F85\u5B8C\u6210";
}
function statusTone(value) {
  return value === "normal" || value === "checked-in" ? "green" : value === "late" || value === "early" || value === "missing" ? "orange" : "muted";
}
function formatWorkMinutes(value) {
  return value === null ? "-" : `${Math.floor(value / 60)}h${String(value % 60).padStart(2, "0")}m`;
}
async function requestApi(path, init = {}) {
  const response = await fetch(`${API_PREFIX}/${path}`, {
    ...init,
    headers: { accept: "application/json", [CLIENT_HEADER]: CLIENT_NAME, ...init.headers }
  });
  const payload = await response.json().catch(() => void 0);
  if (!response.ok) throw new Error(payload !== void 0 && payload !== null && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "\u8003\u52E4\u72B6\u6001\u670D\u52A1\u6682\u4E0D\u53EF\u7528\u3002");
  if (payload === void 0) throw new Error("\u8003\u52E4\u72B6\u6001\u670D\u52A1\u6CA1\u6709\u8FD4\u56DE\u6570\u636E\u3002");
  return payload;
}
function installStyles() {
  document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`)?.remove();
  const style = document.createElement("style");
  style.dataset.pluginCss = STYLE_ID;
  style.textContent = client_default;
  document.head.appendChild(style);
  return () => {
    style.remove();
  };
}
return module.exports; } });
//# sourceMappingURL=client.js.map
