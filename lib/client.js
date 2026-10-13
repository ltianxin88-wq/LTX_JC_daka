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
var client_default = '.iepms-attendance-workspace { height:100%; min-height:0; box-sizing:border-box; display:flex; flex-direction:column; overflow:hidden; background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-primary,#202124); }\n.iepms-attendance-header { height: 62px; padding: 0 24px; border-bottom: 1px solid var(--dsw-alias-border-secondary, rgba(0,0,0,.1)); display:flex; align-items:center; justify-content:space-between; }\n.iepms-attendance-header { flex:none; }.iepms-attendance-scroll { min-height:0; flex:1 1 auto; overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; scrollbar-gutter:stable; }\n.iepms-attendance-header > div { display:flex; gap:10px; align-items:center; min-width:0; }.iepms-attendance-header h1,.iepms-attendance-header p { margin:0; }.iepms-attendance-header h1 { font-size:16px; line-height:21px; font-weight:650; letter-spacing:0; }.iepms-attendance-header p { font-size:12px; line-height:18px; color:var(--dsw-alias-label-secondary,#6b7280); }\n.iepms-attendance-back,.iepms-attendance-refresh { width:32px; height:32px; padding:0; border:0; background:transparent; color:inherit; display:grid; place-items:center; border-radius:6px; cursor:pointer; }.iepms-attendance-back:hover,.iepms-attendance-refresh:hover { background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06)); }.iepms-attendance-refresh:disabled { opacity:.45; cursor:default; }\n.iepms-attendance-header-actions { display:flex; align-items:center; gap:8px; }.iepms-attendance-view-switch { padding:3px; display:flex; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.035)); }.iepms-attendance-view-switch button { min-width:62px; height:27px; padding:0 10px; border:0; border-radius:4px; background:transparent; color:var(--dsw-alias-label-secondary,#6b7280); font:inherit; font-size:12px; cursor:pointer; }.iepms-attendance-view-switch button.is-active { background:var(--dsw-alias-bg-layer-1,#fff); color:#147be8; font-weight:650; box-shadow:0 1px 3px rgba(24,78,130,.1); }.iepms-attendance-view-switch button:active { transform:translateY(1px); }\n.iepms-attendance-trigger { height:34px; margin:4px 0; padding:6px 10px; display:flex; align-items:center; gap:8px; border:0; border-radius:6px; background:transparent; color:var(--dsw-alias-label-primary,#202124); font:inherit; font-size:14px; line-height:20px; cursor:pointer; }.iepms-attendance-trigger:hover,.iepms-attendance-trigger.is-active { background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06)); }.iepms-attendance-trigger.is-rail { width:36px; height:36px; margin:7px 0 3px; padding:0; justify-content:center; }\n.iepms-attendance-content { width:min(1180px,100%); margin:0 auto; padding:24px; box-sizing:border-box; display:grid; gap:18px; }.iepms-attendance-mode { min-height:40px; padding:0 12px; display:flex; align-items:center; gap:8px; border-left:3px solid #1389a9; background:var(--dsw-alias-bg-layer-2,rgba(19,137,169,.06)); color:var(--dsw-alias-label-primary,#202124); font-size:13px; }.iepms-attendance-mode > span { font-weight:650; }.iepms-attendance-mode p { margin:0; color:var(--dsw-alias-label-secondary,#6b7280); }\n.iepms-attendance-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }.iepms-attendance-metric { min-height:108px; padding:15px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); box-sizing:border-box; display:grid; align-content:start; gap:5px; }.iepms-attendance-metric p,.iepms-attendance-metric span { margin:0; font-size:12px; color:var(--dsw-alias-label-secondary,#6b7280); }.iepms-attendance-metric strong { font-size:22px; line-height:29px; letter-spacing:0; }.iepms-attendance-metric .is-good,.iepms-attendance-readiness .is-ready { color:#17803d; }.iepms-attendance-metric .is-warning,.iepms-attendance-readiness .is-missing { color:#a55d00; }\n.iepms-attendance-columns { display:grid; grid-template-columns:1.2fr .8fr; gap:12px; }.iepms-attendance-section { min-width:0; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); }.iepms-attendance-section > header { height:42px; padding:0 14px; display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); }.iepms-attendance-section h2 { margin:0; font-size:13px; line-height:18px; font-weight:650; }\n.iepms-attendance-events,.iepms-attendance-tasks,.iepms-attendance-readiness ul { margin:0; padding:0; list-style:none; }.iepms-attendance-events li { min-height:38px; padding:0 14px; display:grid; grid-template-columns:148px 1fr; gap:12px; align-items:center; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); font-size:13px; }.iepms-attendance-events li:last-child,.iepms-attendance-tasks li:last-child { border-bottom:0; }.iepms-attendance-events time { color:var(--dsw-alias-label-secondary,#6b7280); font-variant-numeric:tabular-nums; }.iepms-attendance-events .is-error span { color:#c13030; }.iepms-attendance-events .is-warning span { color:#a55d00; }\n.iepms-attendance-tasks li,.iepms-attendance-readiness li { min-height:42px; padding:0 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); font-size:13px; }.iepms-attendance-tasks strong,.iepms-attendance-readiness strong { font-size:12px; font-weight:600; }.iepms-attendance-tasks .is-ready { color:#17803d; }.iepms-attendance-tasks .is-running { color:#1389a9; }.iepms-attendance-tasks .is-disabled { color:#a55d00; }.iepms-attendance-empty { padding:16px 14px; margin:0; color:var(--dsw-alias-label-secondary,#6b7280); font-size:13px; }.iepms-attendance-state { max-width:520px; margin:56px auto; padding:20px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; }.iepms-attendance-state h2,.iepms-attendance-state p { margin:0; }.iepms-attendance-state h2 { font-size:16px; }.iepms-attendance-state p { margin-top:7px; color:var(--dsw-alias-label-secondary,#6b7280); font-size:13px; }.iepms-attendance-state button { margin-top:14px; min-height:30px; padding:5px 11px; border:0; border-radius:5px; background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.08)); color:inherit; font:inherit; cursor:pointer; }\n.iepms-attendance-config > header span { margin-left:auto; font-size:12px; color:var(--dsw-alias-label-secondary,#6b7280); }.iepms-attendance-config form { padding:16px 14px; }.iepms-attendance-config-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }.iepms-attendance-config-grid label { display:grid; gap:6px; font-size:12px; color:var(--dsw-alias-label-secondary,#6b7280); }.iepms-attendance-config input,.iepms-attendance-config select { width:100%; height:34px; box-sizing:border-box; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.14)); border-radius:5px; padding:0 10px; background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-primary,#202124); font:inherit; font-size:13px; outline:none; }.iepms-attendance-config input:focus,.iepms-attendance-config select:focus { border-color:#1389a9; box-shadow:0 0 0 2px rgba(19,137,169,.12); }.iepms-attendance-config input:disabled { opacity:.55; }.iepms-attendance-config-options { display:flex; flex-wrap:wrap; gap:18px; margin-top:15px; }.iepms-attendance-config-options label { display:flex; align-items:center; gap:7px; font-size:13px; cursor:pointer; }.iepms-attendance-config-options input { width:15px; height:15px; padding:0; accent-color:#1389a9; }.iepms-attendance-config-actions { margin-top:16px; display:flex; align-items:center; justify-content:space-between; gap:18px; }.iepms-attendance-config-actions p { margin:0; font-size:12px; color:var(--dsw-alias-label-secondary,#6b7280); }.iepms-attendance-config-actions button { flex:none; min-width:92px; min-height:34px; padding:6px 14px; border:0; border-radius:5px; background:#1389a9; color:#fff; font:inherit; font-size:13px; font-weight:600; cursor:pointer; }.iepms-attendance-config-actions button:hover { background:#0f7895; }.iepms-attendance-config-actions button:disabled { opacity:.55; cursor:default; }.iepms-attendance-config-message { margin:12px 0 0; padding:8px 10px; border-radius:4px; font-size:12px; }.iepms-attendance-config-message.is-success { background:rgba(23,128,61,.09); color:#17803d; }.iepms-attendance-config-message.is-error { background:rgba(193,48,48,.08); color:#b52b2b; }\n.iepms-roster-manager > header { gap:8px; }.iepms-roster-manager > header > span { margin-left:auto; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-roster-manager > header > button { min-height:29px; padding:4px 10px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.14)); border-radius:5px; background:var(--dsw-alias-bg-layer-1,#fff); color:inherit; font:inherit; font-size:11px; cursor:pointer; }.iepms-roster-manager > header > button.is-primary { border-color:#147be8; background:#147be8; color:#fff; font-weight:600; }.iepms-roster-manager > header > button:disabled { opacity:.45; cursor:default; }.iepms-roster-toolbar { min-height:45px; padding:8px 12px; box-sizing:border-box; display:flex; align-items:center; gap:12px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); }.iepms-roster-toolbar input { width:min(340px,45%); height:29px; padding:0 9px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.14)); border-radius:5px; background:var(--dsw-alias-bg-layer-1,#fff); color:inherit; font:inherit; font-size:11px; outline:none; }.iepms-roster-toolbar input:focus { border-color:#147be8; box-shadow:0 0 0 2px rgba(20,123,232,.1); }.iepms-roster-toolbar p { margin:0; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-roster-table-wrap { overflow:auto; min-height:90px; max-height:540px; }.iepms-roster-table-wrap table { width:100%; min-width:1260px; border-collapse:separate; border-spacing:0; font-size:11px; }.iepms-roster-table-wrap th { position:sticky; top:0; z-index:1; height:31px; padding:0 6px; text-align:left; white-space:nowrap; color:var(--dsw-alias-label-secondary,#6b7280); background:var(--dsw-alias-bg-layer-2,#fff); border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); font-weight:600; }.iepms-roster-table-wrap td { height:38px; padding:3px 5px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.065)); }.iepms-roster-table-wrap th:nth-child(1),.iepms-roster-table-wrap td:nth-child(1) { width:210px; }.iepms-roster-table-wrap th:nth-child(2),.iepms-roster-table-wrap td:nth-child(2) { width:110px; }.iepms-roster-table-wrap th:nth-child(3),.iepms-roster-table-wrap td:nth-child(3) { width:95px; }.iepms-roster-table-wrap th:nth-child(4),.iepms-roster-table-wrap td:nth-child(4) { width:90px; }.iepms-roster-table-wrap th:nth-child(5),.iepms-roster-table-wrap td:nth-child(5) { width:125px; }.iepms-roster-table-wrap th:nth-child(6),.iepms-roster-table-wrap td:nth-child(6) { width:120px; }.iepms-roster-table-wrap th:nth-child(7),.iepms-roster-table-wrap td:nth-child(7) { width:115px; }.iepms-roster-table-wrap th:nth-child(8),.iepms-roster-table-wrap td:nth-child(8) { width:220px; }.iepms-roster-table-wrap input { width:100%; height:29px; box-sizing:border-box; padding:0 7px; border:1px solid transparent; border-radius:4px; background:transparent; color:inherit; font:inherit; font-size:11px; outline:none; }.iepms-roster-table-wrap input:hover { border-color:var(--dsw-alias-border-secondary,rgba(0,0,0,.12)); }.iepms-roster-table-wrap input:focus { border-color:#147be8; background:var(--dsw-alias-bg-layer-1,#fff); box-shadow:0 0 0 2px rgba(20,123,232,.08); }.iepms-roster-webhook { display:flex; align-items:center; gap:4px; }.iepms-roster-webhook button,.iepms-roster-delete { min-height:27px; padding:3px 7px; border:0; border-radius:4px; background:transparent; color:#b52b2b; font:inherit; font-size:10px; cursor:pointer; white-space:nowrap; }.iepms-roster-webhook button:hover,.iepms-roster-delete:hover { background:rgba(193,48,48,.07); }.iepms-roster-manager > footer { min-height:40px; padding:0 12px; display:flex; align-items:center; justify-content:space-between; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-roster-manager > footer div { display:flex; gap:6px; }.iepms-roster-manager > footer button,.iepms-roster-error button { min-height:27px; padding:3px 9px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.12)); border-radius:4px; background:var(--dsw-alias-bg-layer-1,#fff); color:inherit; font:inherit; font-size:11px; cursor:pointer; }.iepms-roster-manager > footer button:disabled { opacity:.4; cursor:default; }.iepms-roster-message { margin:0; padding:8px 12px; border-top:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.07)); font-size:11px; }.iepms-roster-message.is-success { color:#17803d; background:rgba(23,128,61,.035); }.iepms-roster-message.is-error,.iepms-roster-error { color:#b52b2b; background:rgba(193,48,48,.035); }.iepms-roster-error { padding:14px; display:flex; justify-content:space-between; align-items:center; }.iepms-roster-error p { margin:0; font-size:12px; }\n.iepms-personal-content { width:min(1240px,100%); margin:0 auto; padding:18px 20px 24px; box-sizing:border-box; display:grid; gap:14px; }.iepms-personal-notice { min-height:36px; padding:0 12px; display:flex; align-items:center; gap:8px; border:1px solid rgba(20,123,232,.18); border-radius:6px; background:rgba(20,123,232,.055); color:var(--dsw-alias-label-secondary,#5f6b7a); font-size:12px; }.iepms-personal-account { min-height:58px; padding:12px 14px; box-sizing:border-box; display:grid; grid-template-columns:minmax(190px,.65fr) minmax(360px,1.35fr); align-items:center; gap:18px; border:1px solid rgba(20,123,232,.18); border-left:3px solid #147be8; border-radius:6px; background:rgba(20,123,232,.035); }.iepms-personal-account-intro { display:flex; align-items:center; gap:9px; }.iepms-personal-account-intro > svg { color:#147be8; }.iepms-personal-account-intro > span { display:grid; gap:2px; }.iepms-personal-account strong { font-size:13px; font-weight:650; }.iepms-personal-account small,.iepms-personal-account span,.iepms-personal-account p { color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-personal-account form { display:grid; grid-template-columns:auto minmax(180px,1fr) auto; align-items:center; gap:9px; }.iepms-personal-account label { font-size:12px; font-weight:600; }.iepms-personal-account input { width:100%; height:32px; box-sizing:border-box; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.15)); border-radius:5px; padding:0 10px; background:var(--dsw-alias-bg-layer-1,#fff); color:inherit; font:inherit; font-size:12px; outline:none; }.iepms-personal-account input:focus { border-color:#147be8; box-shadow:0 0 0 2px rgba(20,123,232,.12); }.iepms-personal-account-actions { display:flex; gap:7px; }.iepms-personal-account button { min-height:30px; padding:4px 12px; border:1px solid #147be8; border-radius:5px; background:#147be8; color:#fff; font:inherit; font-size:12px; font-weight:600; cursor:pointer; }.iepms-personal-account button:hover { background:#0d6fd7; }.iepms-personal-account button:disabled { opacity:.55; cursor:default; }.iepms-personal-account button.is-secondary { border-color:var(--dsw-alias-border-secondary,rgba(0,0,0,.14)); background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-secondary,#6b7280); }.iepms-personal-account-message { grid-column:2; margin:0; }.iepms-personal-account .is-success { color:#17803d; }.iepms-personal-account .is-error { color:#b52b2b; }.iepms-personal-account.is-configured { grid-template-columns:auto minmax(220px,1fr) auto auto; border-left-color:#159447; background:rgba(21,148,71,.035); }.iepms-personal-account.is-configured > svg { color:#159447; }.iepms-personal-account.is-configured > div { display:grid; gap:2px; }.iepms-personal-account.is-configured p { margin:0; }.iepms-personal-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }.iepms-personal-metric { min-height:105px; padding:13px 15px; display:flex; flex-direction:column; justify-content:center; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); }.iepms-personal-metric > div { display:flex; align-items:center; gap:8px; }.iepms-personal-metric > div > span { width:27px; height:27px; display:grid; place-items:center; border-radius:5px; background:rgba(20,123,232,.08); color:#147be8; }.iepms-personal-metric p,.iepms-personal-metric small { margin:0; color:var(--dsw-alias-label-secondary,#6b7280); font-size:12px; }.iepms-personal-metric strong { margin-top:6px; font-size:23px; line-height:28px; font-variant-numeric:tabular-nums; }.iepms-personal-metric.is-green strong { color:#159447; }.iepms-personal-metric.is-blue strong { color:#147be8; }.iepms-personal-metric.is-orange strong { color:#e56b10; }.iepms-personal-metric.is-muted strong { color:var(--dsw-alias-label-primary,#202124); }.iepms-personal-metric small { margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n.iepms-personal-grid { display:grid; grid-template-columns:1.08fr .92fr; gap:12px; }.iepms-personal-card { min-width:0; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); }.iepms-personal-card > header { min-height:42px; padding:0 13px; display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); }.iepms-personal-card > header h2 { margin:0; font-size:13px; font-weight:650; }.iepms-personal-card > header > span:first-child { display:flex; align-items:center; gap:8px; }.iepms-personal-calendar > header { justify-content:space-between; }.iepms-personal-calendar > header > div { display:flex; align-items:center; gap:5px; }.iepms-personal-calendar > header button { width:27px; height:27px; padding:0; border:0; border-radius:5px; display:grid; place-items:center; background:transparent; color:inherit; cursor:pointer; }.iepms-personal-calendar > header button:hover { background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06)); }.iepms-personal-calendar > header button:disabled { opacity:.3; cursor:default; }.iepms-personal-calendar > header strong { min-width:76px; text-align:center; font-size:12px; font-weight:600; }.iepms-calendar-weekdays,.iepms-calendar-days { display:grid; grid-template-columns:repeat(7,1fr); }.iepms-calendar-weekdays { margin:10px 12px 0; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; text-align:center; }.iepms-calendar-weekdays span { padding:5px 0; }.iepms-calendar-days { margin:0 12px; border-top:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); border-left:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); }.iepms-calendar-day { min-height:42px; padding:6px; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; gap:6px; border-right:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); color:var(--dsw-alias-label-primary,#202124); font-size:11px; }.iepms-calendar-day.is-outside { color:var(--dsw-alias-label-tertiary,#a1a8b3); background:rgba(127,139,152,.025); }.iepms-calendar-day.is-today { box-shadow:inset 0 0 0 1.5px #147be8; background:rgba(20,123,232,.04); }.iepms-calendar-day i,.iepms-calendar-legend i { width:7px; height:7px; border-radius:50%; background:#aab2bd; }.iepms-calendar-day i.is-normal,.iepms-calendar-day i.is-checked-in,.iepms-calendar-legend i.is-normal { background:#1ab55c; }.iepms-calendar-day i.is-late,.iepms-calendar-day i.is-early,.iepms-calendar-legend i.is-late { background:#f38a2e; }.iepms-calendar-day i.is-missing,.iepms-calendar-legend i.is-missing { background:#df4747; }.iepms-calendar-day i.is-pending,.iepms-calendar-legend i.is-pending { background:#9ca6b4; }.iepms-calendar-legend { min-height:38px; padding:0 14px; display:flex; align-items:center; gap:16px; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-calendar-legend span { display:flex; align-items:center; gap:5px; }\n.iepms-personal-stats { padding-bottom:4px; }.iepms-stat-row { min-height:45px; padding:0 14px; display:grid; grid-template-columns:72px 54px minmax(80px,1fr) 40px; align-items:center; gap:10px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.065)); font-size:12px; }.iepms-stat-row:last-child { border-bottom:0; }.iepms-stat-row > strong { color:#147be8; font-size:13px; }.iepms-stat-row > div { height:8px; overflow:hidden; border-radius:4px; background:rgba(127,139,152,.13); }.iepms-stat-row > div i { display:block; height:100%; border-radius:inherit; background:#3a9af3; }.iepms-stat-row small { color:var(--dsw-alias-label-secondary,#6b7280); text-align:right; font-size:11px; }.iepms-stat-row.is-green > strong { color:#159447; }.iepms-stat-row.is-green > div i { background:#22ad60; }.iepms-stat-row.is-orange > strong { color:#e56b10; }.iepms-stat-row.is-orange > div i { background:#f59742; }.iepms-stat-row.is-red > strong { color:#d63f3f; }.iepms-stat-row.is-red > div i { background:#df5a5a; }\n.iepms-personal-makeup > header > svg { color:#147be8; }.iepms-personal-makeup > header > span { display:grid; gap:1px; }.iepms-personal-makeup > header small { color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; font-weight:400; }.iepms-personal-makeup-list { padding:10px 12px 12px; display:grid; gap:8px; }.iepms-personal-makeup-item { min-height:58px; margin:0; padding:10px 11px; display:grid; grid-template-columns:minmax(190px,1fr) 144px minmax(150px,.8fr) auto; align-items:center; gap:10px; box-sizing:border-box; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:5px; background:var(--dsw-alias-bg-layer-1,#fff); }.iepms-personal-makeup-meta { min-width:0; display:grid; grid-template-columns:auto auto; align-items:center; justify-content:start; gap:6px; }.iepms-personal-makeup-meta strong { font-size:13px; font-variant-numeric:tabular-nums; }.iepms-personal-makeup-meta span { padding:2px 6px; border-radius:3px; background:rgba(20,123,232,.09); color:#147be8; font-size:10px; font-weight:600; }.iepms-personal-makeup-meta span.is-overtime { background:rgba(229,107,16,.1); color:#ba5607; }.iepms-personal-makeup-meta p { grid-column:1 / -1; margin:0; overflow:hidden; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; text-overflow:ellipsis; white-space:nowrap; }.iepms-personal-makeup-item > label { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; gap:6px; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; white-space:nowrap; }.iepms-personal-makeup-item input { min-width:0; width:100%; height:30px; box-sizing:border-box; padding:0 8px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.14)); border-radius:4px; background:var(--dsw-alias-bg-layer-1,#fff); color:inherit; font:inherit; font-size:11px; outline:none; }.iepms-personal-makeup-item input:focus { border-color:#147be8; box-shadow:0 0 0 2px rgba(20,123,232,.1); }.iepms-personal-makeup-actions { display:flex; flex-direction:column; align-items:flex-end; gap:4px; }.iepms-personal-makeup-actions button { min-height:30px; padding:4px 10px; border:1px solid #147be8; border-radius:4px; background:#147be8; color:#fff; font:inherit; font-size:11px; font-weight:600; cursor:pointer; white-space:nowrap; }.iepms-personal-makeup-actions button:disabled { opacity:.55; cursor:default; }.iepms-personal-makeup-actions small { max-width:180px; color:#b52b2b; font-size:10px; text-align:right; }.iepms-personal-makeup-item.is-submitted { grid-template-columns:minmax(200px,1fr) minmax(220px,1.5fr) auto; background:rgba(21,148,71,.025); border-left:3px solid #159447; }.iepms-personal-makeup-item.is-submitted > div { display:flex; align-items:center; gap:8px; }.iepms-personal-makeup-item.is-submitted strong { font-size:13px; font-variant-numeric:tabular-nums; }.iepms-personal-makeup-item.is-submitted span { color:#17803d; font-size:11px; }.iepms-personal-makeup-item.is-submitted p,.iepms-personal-makeup-item.is-submitted small { margin:0; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-personal-makeup-item.is-submitted small { text-align:right; font-variant-numeric:tabular-nums; }.iepms-personal-records > header > span { margin-left:auto; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-personal-table-wrap { overflow-x:auto; padding:8px 12px 12px; }.iepms-personal-table-wrap table { width:100%; border-collapse:separate; border-spacing:0; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.09)); border-radius:5px; overflow:hidden; font-size:12px; font-variant-numeric:tabular-nums; }.iepms-personal-table-wrap th { height:30px; padding:0 12px; text-align:left; color:var(--dsw-alias-label-secondary,#6b7280); background:rgba(127,139,152,.055); font-weight:550; }.iepms-personal-table-wrap td { height:30px; padding:0 12px; border-top:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.07)); }.iepms-personal-table-wrap td strong { font-size:11px; }.iepms-personal-table-wrap td strong.is-normal,.iepms-personal-table-wrap td strong.is-checked-in { color:#159447; }.iepms-personal-table-wrap td strong.is-late,.iepms-personal-table-wrap td strong.is-early { color:#e56b10; }.iepms-personal-table-wrap td strong.is-missing { color:#d63f3f; }.iepms-personal-table-wrap td strong.is-pending { color:#7b8491; }.iepms-personal-empty { max-width:520px; margin:64px auto; padding:28px; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; text-align:center; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; }.iepms-personal-empty h2 { margin:10px 0 0; font-size:16px; }.iepms-personal-empty p { margin:7px 0 0; color:var(--dsw-alias-label-secondary,#6b7280); font-size:13px; }.iepms-personal-empty button { margin-top:16px; min-height:34px; padding:6px 14px; border:0; border-radius:5px; background:#147be8; color:#fff; font:inherit; font-size:13px; cursor:pointer; }.iepms-personal-empty button:active { transform:translateY(1px); }\n.iepms-personal-automation { border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); }.iepms-personal-automation > header { min-height:52px; padding:0 14px; display:grid; grid-template-columns:minmax(220px,1fr) auto auto; align-items:center; gap:14px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); }.iepms-personal-automation > header > div:first-child { display:flex; align-items:center; gap:9px; }.iepms-personal-automation > header > div:first-child > svg { color:#147be8; }.iepms-personal-automation > header span { display:grid; gap:1px; }.iepms-personal-automation strong { font-size:13px; font-weight:650; }.iepms-personal-automation small { color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-personal-run-state { display:flex; align-items:center; gap:6px; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-personal-run-state i { width:7px; height:7px; border-radius:50%; background:#9ca6b4; }.iepms-personal-run-state.is-running i { background:#147be8; box-shadow:0 0 0 3px rgba(20,123,232,.12); }.iepms-personal-run-state.is-success i { background:#159447; }.iepms-personal-run-state.is-error i { background:#d63f3f; }.iepms-personal-run-state time { padding-left:4px; color:var(--dsw-alias-label-tertiary,#8a94a2); }.iepms-personal-run-now,.iepms-personal-schedule-save { min-height:31px; padding:4px 13px; border:1px solid #147be8; border-radius:5px; background:#147be8; color:#fff; font:inherit; font-size:12px; font-weight:600; cursor:pointer; }.iepms-personal-run-now:hover,.iepms-personal-schedule-save:hover { background:#0d6fd7; }.iepms-personal-run-now:disabled,.iepms-personal-schedule-save:disabled { opacity:.45; cursor:default; }.iepms-personal-schedule { min-height:58px; padding:10px 14px; box-sizing:border-box; display:grid; grid-template-columns:minmax(180px,1fr) repeat(2,minmax(145px,.55fr)) auto; align-items:center; gap:14px; }.iepms-personal-schedule > label:not(.iepms-personal-schedule-toggle) { display:grid; grid-template-columns:auto minmax(86px,1fr); align-items:center; gap:8px; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-personal-schedule input[type="time"] { width:100%; height:31px; box-sizing:border-box; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.14)); border-radius:5px; padding:0 8px; background:var(--dsw-alias-bg-layer-1,#fff); color:inherit; font:inherit; font-size:12px; }.iepms-personal-schedule input:disabled { opacity:.5; }.iepms-personal-schedule-toggle { display:flex; align-items:center; gap:9px; cursor:pointer; }.iepms-personal-schedule-toggle input { width:16px; height:16px; accent-color:#147be8; }.iepms-personal-schedule-toggle > span { display:grid; gap:1px; }.iepms-personal-automation-hint { margin:0; padding:7px 14px; border-top:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.07)); color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-personal-automation-hint.is-error { color:#b52b2b; background:rgba(193,48,48,.035); }.iepms-personal-automation-hint.is-success,.iepms-personal-automation-hint.is-status { color:#17803d; background:rgba(23,128,61,.035); }\n.iepms-personal-profile { border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); }.iepms-personal-profile > header { min-height:46px; padding:0 14px; display:flex; align-items:center; gap:9px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); }.iepms-personal-profile > header > svg { color:#147be8; }.iepms-personal-profile > header span { display:grid; gap:1px; }.iepms-personal-profile strong { font-size:13px; font-weight:650; }.iepms-personal-profile small,.iepms-personal-profile span,.iepms-personal-profile p { color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-personal-profile form { padding:12px 14px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:11px 14px; }.iepms-personal-profile form label { display:grid; gap:5px; }.iepms-personal-profile form label.is-wide { grid-column:span 2; }.iepms-personal-profile form label > div { display:flex; gap:6px; }.iepms-personal-profile input { width:100%; height:31px; box-sizing:border-box; padding:0 9px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.14)); border-radius:5px; background:var(--dsw-alias-bg-layer-1,#fff); color:inherit; font:inherit; font-size:12px; outline:none; }.iepms-personal-profile input:focus { border-color:#147be8; box-shadow:0 0 0 2px rgba(20,123,232,.1); }.iepms-personal-profile button { min-height:31px; padding:4px 12px; border:1px solid #147be8; border-radius:5px; background:#147be8; color:#fff; font:inherit; font-size:11px; font-weight:600; cursor:pointer; white-space:nowrap; }.iepms-personal-profile button.is-secondary,.iepms-personal-profile form label button { border-color:var(--dsw-alias-border-secondary,rgba(0,0,0,.14)); background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-secondary,#6b7280); }.iepms-personal-profile-actions { display:flex; align-items:end; justify-content:flex-end; gap:7px; }.iepms-personal-profile-message { margin:0; padding:8px 14px; border-top:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.07)); }.iepms-personal-profile-message.is-success,.iepms-personal-profile .is-success { color:#17803d; }.iepms-personal-profile-message.is-error,.iepms-personal-profile .is-error { color:#b52b2b; }.iepms-personal-profile.is-summary { min-height:58px; padding:10px 14px; box-sizing:border-box; display:grid; grid-template-columns:auto minmax(220px,1fr) auto auto; align-items:center; gap:10px; border-left:3px solid #147be8; }.iepms-personal-profile.is-summary > svg { color:#147be8; }.iepms-personal-profile.is-summary > div { display:grid; gap:2px; }.iepms-personal-profile.is-summary p { margin:0; }\n.iepms-personal-skeleton { min-height:105px; border-radius:6px; background:linear-gradient(90deg,rgba(127,139,152,.08),rgba(127,139,152,.16),rgba(127,139,152,.08)); background-size:200% 100%; animation:iepms-skeleton 1.25s ease-in-out infinite; }.iepms-personal-skeleton.is-large { min-height:330px; }.iepms-personal-skeleton.is-table { min-height:190px; }@keyframes iepms-skeleton { from { background-position:100% 0; } to { background-position:-100% 0; } }@media (prefers-reduced-motion:reduce) { .iepms-personal-skeleton { animation:none; } }\n@media (max-width: 760px) { .iepms-attendance-header { padding:0 14px; }.iepms-attendance-content { padding:14px; }.iepms-attendance-summary,.iepms-attendance-columns { grid-template-columns:1fr; }.iepms-attendance-mode { align-items:flex-start; padding:10px 12px; flex-wrap:wrap; }.iepms-attendance-mode p { flex-basis:100%; margin-left:23px; }.iepms-attendance-events li { grid-template-columns:1fr; gap:1px; padding:8px 14px; } }\n@media (max-width: 900px) { .iepms-personal-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); }.iepms-personal-grid { grid-template-columns:1fr; } }\n@media (max-width: 760px) { .iepms-attendance-header { height:auto; min-height:62px; padding-top:8px; padding-bottom:8px; gap:8px; }.iepms-attendance-header > div:first-child > span p { display:none; }.iepms-attendance-view-switch button { min-width:54px; padding:0 7px; }.iepms-attendance-config-grid { grid-template-columns:1fr; }.iepms-attendance-config-actions { align-items:flex-start; flex-direction:column; }.iepms-attendance-config-actions button { width:100%; }.iepms-roster-manager > header { height:auto; min-height:42px; padding:7px 10px; flex-wrap:wrap; }.iepms-roster-manager > header > span { flex-basis:100%; margin-left:24px; }.iepms-roster-toolbar { align-items:flex-start; flex-direction:column; }.iepms-roster-toolbar input { width:100%; }.iepms-personal-content { padding:14px; }.iepms-personal-account,.iepms-personal-account.is-configured { grid-template-columns:1fr; gap:10px; }.iepms-personal-account form { grid-template-columns:1fr; }.iepms-personal-account-actions { justify-content:flex-end; }.iepms-personal-account-message { grid-column:1; }.iepms-personal-account.is-configured > button { width:100%; }.iepms-personal-profile form { grid-template-columns:1fr; }.iepms-personal-profile form label.is-wide { grid-column:auto; }.iepms-personal-profile.is-summary { grid-template-columns:1fr; }.iepms-personal-profile.is-summary > button { width:100%; }.iepms-personal-automation > header,.iepms-personal-schedule { grid-template-columns:1fr; padding:12px 14px; }.iepms-personal-run-now,.iepms-personal-schedule-save { width:100%; }.iepms-personal-run-state { flex-wrap:wrap; }.iepms-personal-metrics { grid-template-columns:1fr; }.iepms-personal-metric { min-height:94px; }.iepms-calendar-day { min-height:38px; padding:5px 2px; }.iepms-calendar-legend { flex-wrap:wrap; padding:8px 12px; }.iepms-stat-row { grid-template-columns:64px 50px minmax(60px,1fr) 34px; gap:7px; padding:0 10px; }.iepms-personal-makeup-item,.iepms-personal-makeup-item.is-submitted { grid-template-columns:1fr; align-items:stretch; }.iepms-personal-makeup-item > label { grid-template-columns:68px 1fr; }.iepms-personal-makeup-actions { align-items:stretch; }.iepms-personal-makeup-actions button { width:100%; }.iepms-personal-makeup-actions small,.iepms-personal-makeup-item.is-submitted small { max-width:none; text-align:left; }.iepms-personal-records > header > span { display:none; } }\n\n/* A missing attendance record is actionable from its own calendar day. */\n.iepms-calendar-day.is-actionable { width:100%; border:0; border-right:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); background:rgba(223,71,71,.055); color:inherit; font:inherit; cursor:pointer; }.iepms-calendar-day.is-actionable:hover { background:rgba(223,71,71,.11); }.iepms-calendar-day.is-actionable:focus-visible { position:relative; z-index:1; outline:2px solid #147be8; outline-offset:-2px; }.iepms-calendar-day.is-selected { box-shadow:inset 0 0 0 1.5px #df4747; }.iepms-calendar-day b { color:#c13030; font-size:9px; font-weight:650; line-height:1; }.iepms-calendar-makeup { margin:0 12px 12px; padding:10px; border-top:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); background:rgba(223,71,71,.025); }.iepms-calendar-makeup > header { min-height:28px; margin-bottom:8px; display:flex; align-items:center; gap:7px; color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; }.iepms-calendar-makeup > header span { font-variant-numeric:tabular-nums; }.iepms-calendar-makeup > header strong { color:var(--dsw-alias-label-primary,#202124); font-size:12px; }.iepms-calendar-makeup > header button { min-height:26px; margin-left:auto; padding:3px 8px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.14)); border-radius:4px; background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-secondary,#6b7280); font:inherit; font-size:11px; cursor:pointer; }.iepms-calendar-makeup .iepms-personal-makeup-item,.iepms-calendar-makeup .iepms-personal-makeup-item.is-submitted { padding:0; grid-template-columns:1fr; align-items:stretch; border:0; border-radius:0; background:transparent; }.iepms-calendar-makeup .iepms-personal-makeup-item > label { grid-template-columns:64px minmax(0,1fr); }.iepms-calendar-makeup .iepms-personal-makeup-actions { align-items:stretch; }.iepms-calendar-makeup .iepms-personal-makeup-actions button { width:100%; }.iepms-calendar-makeup .iepms-personal-makeup-actions small,.iepms-calendar-makeup .iepms-personal-makeup-item.is-submitted small { max-width:none; text-align:left; }.iepms-calendar-makeup .iepms-personal-makeup-item.is-submitted > div { flex-wrap:wrap; }.iepms-calendar-makeup .iepms-personal-makeup-item.is-submitted p { white-space:normal; }\n\n.iepms-calendar-makeup-legend { margin:0 12px 12px; padding:8px 0 0; display:flex; align-items:center; flex-wrap:wrap; gap:7px 14px; border-top:1px dashed var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); color:var(--dsw-alias-label-secondary,#6b7280); font-size:10px; }.iepms-calendar-makeup-legend strong { color:var(--dsw-alias-label-primary,#202124); font-size:11px; }.iepms-calendar-makeup-legend span { display:flex; align-items:center; gap:5px; }.iepms-calendar-makeup-legend i { width:7px; height:7px; border-radius:50%; }.iepms-calendar-makeup-legend i.is-makeup { background:#e56b10; }.iepms-calendar-makeup-legend i.is-overtime { background:#147be8; }.iepms-calendar-makeup-legend small { flex-basis:100%; color:var(--dsw-alias-label-secondary,#6b7280); font-size:10px; }.iepms-calendar-day.is-makeup-reminder { background:rgba(243,138,46,.07); box-shadow:inset 0 0 0 1px rgba(243,138,46,.42); }.iepms-calendar-day.is-overtime-reminder { background:rgba(20,123,232,.055); box-shadow:inset 0 0 0 1px rgba(20,123,232,.35); }.iepms-calendar-day.is-makeup-reminder b { color:#c2640d; }.iepms-calendar-day.is-overtime-reminder b { color:#147be8; }\n\n@media (max-width: 760px) { .iepms-calendar-day b { font-size:8px; }.iepms-calendar-makeup { margin-right:8px; margin-left:8px; padding:9px; }.iepms-calendar-makeup > header { align-items:flex-start; flex-wrap:wrap; }.iepms-calendar-makeup > header strong { flex:1 1 120px; }.iepms-calendar-makeup > header button { margin-left:auto; }.iepms-calendar-makeup-legend { margin-right:8px; margin-left:8px; gap:6px 10px; } }\n';

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
  const [personalAutomation, setPersonalAutomation] = (0, import_react.useState)();
  const [personalMakeup, setPersonalMakeup] = (0, import_react.useState)();
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
  const loadPersonal = (0, import_react.useCallback)(async (background = false) => {
    if (!background) setPersonalState("loading");
    setPersonalError("");
    try {
      const [next, automation, makeup] = await Promise.all([
        requestApi("personal-attendance"),
        requestApi("personal-automation"),
        requestApi("personal-makeup")
      ]);
      if (!isPersonalAttendance(next) || !isPersonalAutomation(automation) || !isPersonalMakeup(makeup)) throw new Error("\u4E2A\u4EBA\u8003\u52E4\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      setPersonal(next);
      setPersonalAutomation(automation);
      setPersonalMakeup(makeup);
      setPersonalState("ready");
    } catch (value) {
      setPersonalState("error");
      setPersonalError(value instanceof Error ? value.message : "\u4E2A\u4EBA\u8003\u52E4\u8BFB\u53D6\u5931\u8D25\u3002");
    }
  }, []);
  (0, import_react.useEffect)(() => {
    if (view === "personal" && personalState === "idle") void loadPersonal();
  }, [loadPersonal, personalState, view]);
  (0, import_react.useEffect)(() => {
    if (view !== "personal" || personalAutomation?.state !== "running") return;
    const timer = window.setInterval(() => {
      void loadPersonal(true);
    }, 3e3);
    return () => {
      window.clearInterval(timer);
    };
  }, [loadPersonal, personalAutomation?.state, view]);
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-scroll", tabIndex: 0, "aria-label": "\u8003\u52E4\u76D1\u63A7\u5185\u5BB9", children: [
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
      view === "personal" && personalState === "ready" && personal !== void 0 && personalAutomation !== void 0 && personalMakeup !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        PersonalDashboard,
        {
          value: personal,
          automation: personalAutomation,
          onAccountSaved: (next) => {
            setPersonal(next);
            void loadPersonal(true);
          },
          onAutomationChanged: setPersonalAutomation,
          makeup: personalMakeup
        }
      )
    ] })
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, { label: "\u63D2\u4EF6\u6570\u636E", value: snapshot.status.application.dataRootAvailable ? "\u53EF\u7528" : "\u4E0D\u53EF\u7528", detail: `${snapshot.status.application.name} ${snapshot.status.application.version}`, good: snapshot.status.application.dataRootAvailable }),
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RosterManager, {}),
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
function PersonalDashboard({ value, automation, makeup, onAccountSaved, onAutomationChanged }) {
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonalAccountEditor, { value, onSaved: onAccountSaved }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonalRosterEditor, { configured: value.configured, accountMasked: value.accountMasked }, value.accountMasked || "unconfigured"),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonalAutomationPanel, { value: automation, onChanged: onAutomationChanged }),
    value.configured && !value.source.latestAvailable && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-personal-notice", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconDataOutlineRegular, { size: 15 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6682\u65E0\u8BE5\u8D26\u53F7\u7684\u8003\u52E4\u6570\u636E\u3002\u5B8C\u6210\u4E00\u6B21\u5DE1\u68C0\u540E\uFF0C\u4E2A\u4EBA\u7248\u4F1A\u4ECE\u672C\u5730\u7ED3\u679C\u4E2D\u6574\u7406\u8BB0\u5F55\u3002" })
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
          const reminder = record?.status === "missing" ? void 0 : makeupReminderForDate(cell.date, makeup);
          const className = `iepms-calendar-day${cell.inMonth ? "" : " is-outside"}${isToday ? " is-today" : ""}${reminder === void 0 ? "" : ` is-${reminder}-reminder`}`;
          const label = record?.status === "missing" ? "\u7F3A\u5361" : reminder === "makeup" ? "\u53EF\u8865\u5361" : reminder === "overtime" ? "\u53EF\u52A0\u73ED\u8865\u5361" : void 0;
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className, title: label === void 0 ? record === void 0 ? cell.date : `${cell.date} ${personalStatusLabel(record.status)}` : `${cell.date} ${label}`, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: cell.day }),
            record !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: `is-${record.status}`, "aria-label": personalStatusLabel(record.status) }),
            label !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: label })
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
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-calendar-makeup-legend", "aria-label": "\u8865\u5361\u63D0\u9192\u56FE\u4F8B", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\u8865\u5361\u63D0\u9192\uFF1A" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "is-makeup" }),
            "\u53EF\u8865\u5361"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "is-overtime" }),
            "\u53EF\u52A0\u73ED\u8865\u5361"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u7F3A\u5361\u540E 72 \u5C0F\u65F6\u5185\u53EF\u8865\u5361\uFF1B\u8D85\u8FC7 72 \u5C0F\u65F6\u663E\u793A\u52A0\u73ED\u8865\u5361\u63D0\u9192\u3002" })
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
function PersonalAccountEditor({ value, onSaved }) {
  const [editing, setEditing] = (0, import_react.useState)(!value.configured);
  const [account, setAccount] = (0, import_react.useState)("");
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [message, setMessage] = (0, import_react.useState)();
  (0, import_react.useEffect)(() => {
    if (!value.configured) setEditing(true);
  }, [value.configured]);
  const save = async (event) => {
    event.preventDefault();
    const normalized = account.trim();
    if (!normalized) return setMessage({ kind: "error", text: "\u8BF7\u586B\u5199\u4E2A\u4EBA\u8003\u52E4\u8D26\u53F7\u3002" });
    setSaving(true);
    setMessage(void 0);
    try {
      const next = await requestApi("personal-account", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account: normalized })
      });
      if (!isPersonalAttendance(next)) throw new Error("\u4E2A\u4EBA\u8D26\u53F7\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      setAccount("");
      setEditing(false);
      setMessage({ kind: "success", text: "\u4E2A\u4EBA\u8D26\u53F7\u5DF2\u4FDD\u5B58\uFF0C\u5DF2\u91CD\u65B0\u5339\u914D\u672C\u5730\u8003\u52E4\u8BB0\u5F55\u3002" });
      onSaved(next);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "\u4E2A\u4EBA\u8D26\u53F7\u4FDD\u5B58\u5931\u8D25\u3002" });
    } finally {
      setSaving(false);
    }
  };
  if (!editing && value.configured) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-personal-account is-configured", "aria-label": "\u4E2A\u4EBA\u8D26\u53F7\u8BBE\u7F6E", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconUserOutlineRegular, { size: 16 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\u4E2A\u4EBA\u8003\u52E4\u8D26\u53F7" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        "\u5DF2\u914D\u7F6E ",
        value.accountMasked,
        " \xB7 \u4EC5\u7528\u4E8E\u5339\u914D\u672C\u5730\u5DE1\u68C0\u7ED3\u679C"
      ] })
    ] }),
    message !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: `is-${message.kind}`, role: "status", children: message.text }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
      setEditing(true);
      setMessage(void 0);
    }, children: "\u66F4\u6362\u8D26\u53F7" })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-personal-account", "aria-label": "\u4E2A\u4EBA\u8D26\u53F7\u8BBE\u7F6E", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-personal-account-intro", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconUserOutlineRegular, { size: 17 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value.configured ? "\u66F4\u6362\u4E2A\u4EBA\u8003\u52E4\u8D26\u53F7" : "\u914D\u7F6E\u4E2A\u4EBA\u8003\u52E4\u8D26\u53F7" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u53EA\u9700\u586B\u5199\u8D26\u53F7\uFF0C\u7528\u4E8E\u5339\u914D\u672C\u5730\u5DE1\u68C0\u7ED3\u679C\uFF0C\u4E0D\u53C2\u4E0E\u767B\u5F55\u3002" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: (event) => {
      void save(event);
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "iepms-personal-account-input", children: "\u4E2A\u4EBA\u8D26\u53F7" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "iepms-personal-account-input", autoComplete: "username", maxLength: 100, value: account, onChange: (event) => {
        setAccount(event.target.value);
      }, placeholder: value.configured ? `\u5F53\u524D\uFF1A${value.accountMasked}` : "\u8BF7\u8F93\u5165\u5DE5\u53F7\u6216\u6253\u5361\u8D26\u53F7", autoFocus: !value.configured }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-personal-account-actions", children: [
        value.configured && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "is-secondary", onClick: () => {
          setEditing(false);
          setAccount("");
          setMessage(void 0);
        }, children: "\u53D6\u6D88" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: saving, children: saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u8D26\u53F7" })
      ] })
    ] }),
    message !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: `iepms-personal-account-message is-${message.kind}`, role: "alert", children: message.text })
  ] });
}
function blankRosterRow() {
  return { rowId: "", projectName: "", projectCode: "", name: "", city: "", account: "", mobile: "", dingtalkId: "", webhookConfigured: false };
}
function RosterManager() {
  const [rows, setRows] = (0, import_react.useState)([]);
  const [state, setState] = (0, import_react.useState)("loading");
  const [search, setSearch] = (0, import_react.useState)("");
  const [page, setPage] = (0, import_react.useState)(0);
  const [dirty, setDirty] = (0, import_react.useState)(false);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [backupAvailable, setBackupAvailable] = (0, import_react.useState)(false);
  const [message, setMessage] = (0, import_react.useState)();
  const load = (0, import_react.useCallback)(async () => {
    setState("loading");
    try {
      const value = await requestApi("roster");
      if (!isRosterTable(value)) throw new Error("\u82B1\u540D\u518C\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      setRows(value.rows);
      setBackupAvailable(value.backupAvailable);
      setDirty(false);
      setState("ready");
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "\u82B1\u540D\u518C\u8BFB\u53D6\u5931\u8D25\u3002" });
      setState("error");
    }
  }, []);
  (0, import_react.useEffect)(() => {
    void load();
  }, [load]);
  const update = (rowId, index, key, value) => {
    setRows((current) => current.map((row, rowIndex) => row.rowId === rowId && rowId ? { ...row, [key]: value } : rowIndex === index ? { ...row, [key]: value } : row));
    setDirty(true);
  };
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = rows.map((row, index) => ({ row, index })).filter(({ row }) => !normalizedSearch || [row.projectName, row.projectCode, row.name, row.city, row.account, row.mobile, row.dingtalkId].some((value) => value.toLowerCase().includes(normalizedSearch)));
  const pageSize = 15;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const save = async () => {
    setSaving(true);
    setMessage(void 0);
    try {
      const value = await requestApi("roster", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows }) });
      if (!isRosterTable(value)) throw new Error("\u82B1\u540D\u518C\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      setRows(value.rows);
      setBackupAvailable(value.backupAvailable);
      setDirty(false);
      setMessage({ kind: "success", text: `\u82B1\u540D\u518C\u5DF2\u4FDD\u5B58\uFF0C\u5171 ${value.rows.length} \u884C\u3002` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "\u82B1\u540D\u518C\u4FDD\u5B58\u5931\u8D25\u3002" });
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-attendance-section iepms-roster-manager", "aria-label": "\u5458\u5DE5\u82B1\u540D\u518C\u7BA1\u7406", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChecklistOutlineRegular, { size: 16 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u5458\u5DE5\u82B1\u540D\u518C" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: state === "ready" ? `${rows.length} \u884C${backupAvailable ? " \xB7 \u5DF2\u4FDD\u7559\u4E0A\u6B21\u5907\u4EFD" : ""}` : "\u6B63\u5728\u8BFB\u53D6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
        setRows((current) => [...current, blankRosterRow()]);
        setPage(Math.floor(rows.length / pageSize));
        setDirty(true);
      }, children: "\u65B0\u589E\u4E00\u884C" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "is-primary", disabled: !dirty || saving || state !== "ready", onClick: () => {
        void save();
      }, children: saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u82B1\u540D\u518C" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-roster-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "search", value: search, onChange: (event) => {
        setSearch(event.target.value);
        setPage(0);
      }, placeholder: "\u641C\u7D22\u9879\u76EE\u3001\u59D3\u540D\u3001\u5730\u5E02\u6216\u8D26\u53F7" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Webhook \u539F\u6587\u4E0D\u56DE\u663E\uFF1B\u7559\u7A7A\u4FDD\u7559\uFF0C\u70B9\u51FB\u6E05\u9664\u540E\u4FDD\u5B58\u624D\u4F1A\u5220\u9664\u3002" })
    ] }),
    state === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-roster-error", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: message?.text }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
        void load();
      }, children: "\u91CD\u8BD5" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-roster-table-wrap", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u9879\u76EE\u540D\u79F0*" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u9879\u76EE\u53F7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u59D3\u540D*" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u5730\u5E02" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u6253\u5361\u8D26\u53F7*" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u624B\u673A\u53F7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u9489\u9489\u53F7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u9489\u9489 Webhook" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u64CD\u4F5C" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: visible.map(({ row, index }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.projectName, onChange: (event) => {
            update(row.rowId, index, "projectName", event.target.value);
          } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.projectCode, onChange: (event) => {
            update(row.rowId, index, "projectCode", event.target.value);
          } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.name, onChange: (event) => {
            update(row.rowId, index, "name", event.target.value);
          } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.city, onChange: (event) => {
            update(row.rowId, index, "city", event.target.value);
          } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.account, onChange: (event) => {
            update(row.rowId, index, "account", event.target.value);
          } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.mobile, onChange: (event) => {
            update(row.rowId, index, "mobile", event.target.value);
          } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.dingtalkId, onChange: (event) => {
            update(row.rowId, index, "dingtalkId", event.target.value);
          } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-roster-webhook", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", value: row.webhook ?? "", onChange: (event) => {
              update(row.rowId, index, "webhook", event.target.value);
            }, placeholder: row.webhookConfigured ? "\u5DF2\u914D\u7F6E\uFF0C\u7559\u7A7A\u4FDD\u7559" : "\u672A\u914D\u7F6E" }),
            row.webhookConfigured && row.webhook === void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
              update(row.rowId, index, "webhook", "");
              update(row.rowId, index, "webhookConfigured", false);
            }, children: "\u6E05\u9664" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "iepms-roster-delete", onClick: () => {
            setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
            setDirty(true);
          }, children: "\u5220\u9664" }) })
        ] }, row.rowId || `new-${index}`)) })
      ] }),
      state === "loading" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "iepms-attendance-empty", children: "\u6B63\u5728\u8BFB\u53D6\u82B1\u540D\u518C\u2026" }),
      state === "ready" && visible.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "iepms-attendance-empty", children: "\u6CA1\u6709\u5339\u914D\u7684\u82B1\u540D\u518C\u6570\u636E\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        "\u7B2C ",
        safePage + 1,
        " / ",
        pageCount,
        " \u9875 \xB7 \u5F53\u524D\u7B5B\u9009 ",
        filtered.length,
        " \u884C"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: safePage === 0, onClick: () => {
          setPage((value) => Math.max(0, value - 1));
        }, children: "\u4E0A\u4E00\u9875" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: safePage >= pageCount - 1, onClick: () => {
          setPage((value) => Math.min(pageCount - 1, value + 1));
        }, children: "\u4E0B\u4E00\u9875" })
      ] })
    ] }),
    message !== void 0 && state !== "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: `iepms-roster-message is-${message.kind}`, role: message.kind === "error" ? "alert" : "status", children: message.text })
  ] });
}
function PersonalRosterEditor({ configured, accountMasked }) {
  const [row, setRow] = (0, import_react.useState)(blankRosterRow());
  const [state, setState] = (0, import_react.useState)(configured ? "loading" : "ready");
  const [editing, setEditing] = (0, import_react.useState)(false);
  const [duplicateCount, setDuplicateCount] = (0, import_react.useState)(0);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [message, setMessage] = (0, import_react.useState)();
  (0, import_react.useEffect)(() => {
    if (!configured) return;
    void requestApi("personal-roster").then((value) => {
      if (!isPersonalRoster(value)) throw new Error("\u4E2A\u4EBA\u8D44\u6599\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      setRow(value.row ?? blankRosterRow());
      setDuplicateCount(value.duplicateCount);
      setEditing(value.row === null);
      setState("ready");
    }).catch((error) => {
      setState("error");
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "\u4E2A\u4EBA\u8D44\u6599\u8BFB\u53D6\u5931\u8D25\u3002" });
    });
  }, [configured]);
  const change = (key, value) => {
    setRow((current) => ({ ...current, [key]: value }));
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(void 0);
    try {
      const value = await requestApi("personal-roster", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ row }) });
      if (!isPersonalRoster(value) || value.row === null) throw new Error("\u4E2A\u4EBA\u8D44\u6599\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      setRow(value.row);
      setDuplicateCount(value.duplicateCount);
      setEditing(false);
      setMessage({ kind: "success", text: "\u4E2A\u4EBA\u82B1\u540D\u518C\u8D44\u6599\u5DF2\u4FDD\u5B58\u3002" });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "\u4E2A\u4EBA\u8D44\u6599\u4FDD\u5B58\u5931\u8D25\u3002" });
    } finally {
      setSaving(false);
    }
  };
  if (!configured) return null;
  if (state === "loading") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "iepms-personal-profile", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u6B63\u5728\u8BFB\u53D6\u4E2A\u4EBA\u82B1\u540D\u518C\u8D44\u6599\u2026" }) });
  if (!editing && state === "ready") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-personal-profile is-summary", "aria-label": "\u4E2A\u4EBA\u82B1\u540D\u518C\u8D44\u6599", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChecklistOutlineRegular, { size: 16 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\u4E2A\u4EBA\u82B1\u540D\u518C\u8D44\u6599" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        row.name || "\u672A\u586B\u5199\u59D3\u540D",
        " \xB7 ",
        row.projectName || "\u672A\u586B\u5199\u9879\u76EE",
        " \xB7 \u8D26\u53F7 ",
        accountMasked
      ] })
    ] }),
    message !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: `is-${message.kind}`, children: message.text }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
      setEditing(true);
      setMessage(void 0);
    }, children: "\u7F16\u8F91\u8D44\u6599" })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-personal-profile", "aria-label": "\u4E2A\u4EBA\u82B1\u540D\u518C\u8D44\u6599", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChecklistOutlineRegular, { size: 16 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\u4E2A\u4EBA\u82B1\u540D\u518C\u8D44\u6599" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
          "\u53EA\u7EF4\u62A4\u8D26\u53F7 ",
          accountMasked,
          " \u5BF9\u5E94\u7684\u4E00\u884C"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: (event) => {
      void save(event);
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u9879\u76EE\u540D\u79F0*" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.projectName, onChange: (event) => {
          change("projectName", event.target.value);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u9879\u76EE\u53F7" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.projectCode, onChange: (event) => {
          change("projectCode", event.target.value);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u59D3\u540D*" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.name, onChange: (event) => {
          change("name", event.target.value);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u5730\u5E02" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.city, onChange: (event) => {
          change("city", event.target.value);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u624B\u673A\u53F7" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.mobile, onChange: (event) => {
          change("mobile", event.target.value);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u9489\u9489\u53F7" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: row.dingtalkId, onChange: (event) => {
          change("dingtalkId", event.target.value);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-personal-profile-actions", children: [
        row.rowId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "is-secondary", onClick: () => {
          setEditing(false);
          setMessage(void 0);
        }, children: "\u53D6\u6D88" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: saving || duplicateCount > 1, children: saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u4E2A\u4EBA\u8D44\u6599" })
      ] })
    ] }),
    duplicateCount > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "iepms-personal-profile-message is-error", children: [
      "\u5F53\u524D\u8D26\u53F7\u5B58\u5728 ",
      duplicateCount,
      " \u884C\uFF0C\u8BF7\u5148\u5230\u7BA1\u7406\u7248\u5408\u5E76\u3002"
    ] }),
    message !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: `iepms-personal-profile-message is-${message.kind}`, role: message.kind === "error" ? "alert" : "status", children: message.text })
  ] });
}
function PersonalAutomationPanel({ value, onChanged }) {
  const initialTimes = value.schedule.times.length > 0 ? value.schedule.times : ["09:15", "18:15"];
  const [enabled, setEnabled] = (0, import_react.useState)(value.schedule.enabled);
  const [morningTime, setMorningTime] = (0, import_react.useState)(initialTimes[0] ?? "09:15");
  const [eveningTime, setEveningTime] = (0, import_react.useState)(initialTimes[1] ?? "18:15");
  const [starting, setStarting] = (0, import_react.useState)(false);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [message, setMessage] = (0, import_react.useState)();
  (0, import_react.useEffect)(() => {
    setEnabled(value.schedule.enabled);
    if (value.schedule.times[0]) setMorningTime(value.schedule.times[0]);
    if (value.schedule.times[1]) setEveningTime(value.schedule.times[1]);
  }, [value.schedule.enabled, value.schedule.times.join("|")]);
  const ready = value.accountConfigured && value.loginReady;
  const running = value.state === "running";
  const start = async () => {
    setStarting(true);
    setMessage(void 0);
    try {
      const next = await requestApi("personal-run", { method: "POST" });
      if (!isPersonalAutomation(next)) throw new Error("\u4E2A\u4EBA\u5DE1\u68C0\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      onChanged(next);
      setMessage({ kind: "success", text: "\u4E2A\u4EBA\u5DE1\u68C0\u5DF2\u542F\u52A8\uFF0C\u5B8C\u6210\u540E\u9875\u9762\u4F1A\u81EA\u52A8\u5237\u65B0\u3002" });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "\u4E2A\u4EBA\u5DE1\u68C0\u542F\u52A8\u5931\u8D25\u3002" });
    } finally {
      setStarting(false);
    }
  };
  const saveSchedule = async () => {
    const times = [morningTime, eveningTime].map((item) => item.trim()).filter(Boolean);
    if (enabled && times.length === 0) return setMessage({ kind: "error", text: "\u8BF7\u81F3\u5C11\u8BBE\u7F6E\u4E00\u4E2A\u5DE1\u68C0\u65F6\u95F4\u3002" });
    setSaving(true);
    setMessage(void 0);
    try {
      const next = await requestApi("personal-schedule", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled, times })
      });
      if (!isPersonalAutomation(next)) throw new Error("\u4E2A\u4EBA\u5B9A\u65F6\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      onChanged(next);
      setMessage({ kind: "success", text: enabled ? "\u4E2A\u4EBA\u5B9A\u65F6\u5DE1\u68C0\u5DF2\u66F4\u65B0\u3002" : "\u4E2A\u4EBA\u5B9A\u65F6\u5DE1\u68C0\u5DF2\u505C\u7528\u3002" });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "\u4E2A\u4EBA\u5B9A\u65F6\u5DE1\u68C0\u4FDD\u5B58\u5931\u8D25\u3002" });
    } finally {
      setSaving(false);
    }
  };
  const stateText = running ? "\u6267\u884C\u4E2D" : value.state === "success" ? "\u4E0A\u6B21\u6210\u529F" : value.state === "error" ? "\u4E0A\u6B21\u5931\u8D25" : "\u5C1A\u672A\u6267\u884C";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-personal-automation", "aria-label": "\u4E2A\u4EBA\u5DE1\u68C0\u8BBE\u7F6E", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconInspectOutlineRegular, { size: 17 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\u4E2A\u4EBA\u5DE1\u68C0" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u4EC5\u540C\u6B65\u5F53\u524D\u4E2A\u4EBA\u8D26\u53F7\uFF0C\u7ED3\u679C\u53EA\u5728\u63D2\u4EF6\u5185\u63D0\u9192" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `iepms-personal-run-state is-${value.state}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
        stateText,
        value.lastCompletedAt && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { children: value.lastCompletedAt.replace("T", " ") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "iepms-personal-run-now", disabled: !ready || running || starting, onClick: () => {
        void start();
      }, children: running || starting ? "\u5DE1\u68C0\u4E2D\u2026" : "\u7ACB\u5373\u5DE1\u68C0" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-personal-schedule", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "iepms-personal-schedule-toggle", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: enabled, disabled: !ready || saving, onChange: (event) => {
          setEnabled(event.target.checked);
        } }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\u5B9A\u65F6\u5DE1\u68C0" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u5DE5\u4F5C\u65E5\u5230\u70B9\u81EA\u52A8\u540C\u6B65" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u4E0A\u73ED\u540C\u6B65" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "time", value: morningTime, disabled: !ready || !enabled || saving, onChange: (event) => {
          setMorningTime(event.target.value);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u4E0B\u73ED\u540C\u6B65" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "time", value: eveningTime, disabled: !ready || !enabled || saving, onChange: (event) => {
          setEveningTime(event.target.value);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "iepms-personal-schedule-save", disabled: !ready || saving, onClick: () => {
        void saveSchedule();
      }, children: saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u5B9A\u65F6" })
    ] }),
    !value.accountConfigured && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "iepms-personal-automation-hint is-error", children: "\u8BF7\u5148\u914D\u7F6E\u4E2A\u4EBA\u8003\u52E4\u8D26\u53F7\u3002" }),
    value.accountConfigured && !value.loginReady && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "iepms-personal-automation-hint is-error", children: "\u6267\u884C\u5DE1\u68C0\u9700\u8981\u767B\u5F55 iEPMS\uFF0C\u8BF7\u5148\u5728\u7BA1\u7406\u7248\u914D\u7F6E\u767B\u5F55\u8D26\u53F7\u548C\u5BC6\u7801\u3002" }),
    value.message && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: `iepms-personal-automation-hint is-${value.state === "error" ? "error" : "status"}`, role: value.state === "error" ? "alert" : "status", children: [
      "\u63D2\u4EF6\u63D0\u9192\uFF1A",
      value.message
    ] }),
    message !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: `iepms-personal-automation-hint is-${message.kind}`, role: message.kind === "error" ? "alert" : "status", children: message.text })
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
function isPersonalAutomation(value) {
  if (value === null || typeof value !== "object" || !("state" in value) || !("schedule" in value)) return false;
  const record = value;
  return ["idle", "running", "success", "error"].includes(String(record.state)) && typeof record.accountConfigured === "boolean" && typeof record.loginReady === "boolean" && record.schedule !== void 0 && typeof record.schedule.enabled === "boolean" && Array.isArray(record.schedule.times);
}
function isPersonalMakeup(value) {
  if (value === null || typeof value !== "object" || !("configured" in value) || !("items" in value)) return false;
  const result = value;
  return typeof result.configured === "boolean" && Array.isArray(result.items) && result.items.every((item) => item !== null && typeof item === "object" && typeof item.attendanceDate === "string" && ["makeup", "overtime", "submitted"].includes(String(item.mode)) && typeof item.deadline === "string" && typeof item.message === "string" && Array.isArray(item.overtimeReminderDates) && item.overtimeReminderDates.every((date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(date)));
}
function isRosterRow(value) {
  if (value === null || typeof value !== "object") return false;
  const row = value;
  return ["rowId", "projectName", "projectCode", "name", "city", "account", "mobile", "dingtalkId"].every((key) => typeof row[key] === "string") && typeof row.webhookConfigured === "boolean";
}
function isRosterTable(value) {
  if (value === null || typeof value !== "object" || !("rows" in value)) return false;
  const table = value;
  return Array.isArray(table.rows) && table.rows.every(isRosterRow) && typeof table.backupAvailable === "boolean";
}
function isPersonalRoster(value) {
  if (value === null || typeof value !== "object" || !("configured" in value)) return false;
  const result = value;
  return typeof result.configured === "boolean" && typeof result.duplicateCount === "number" && (result.row === null || isRosterRow(result.row));
}
function dateKey(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
function makeupReminderForDate(date, makeup) {
  let overtimeAvailable = false;
  for (const item of makeup.items) {
    const deadlineDate = item.deadline.slice(0, 10);
    if (date > item.attendanceDate && date <= deadlineDate) return "makeup";
    if (item.overtimeReminderDates.includes(date)) overtimeAvailable = true;
  }
  return overtimeAvailable ? "overtime" : void 0;
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
