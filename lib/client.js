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
var client_default = ".iepms-attendance-workspace { min-height: 100%; box-sizing: border-box; background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #202124); }\n.iepms-attendance-header { height: 62px; padding: 0 24px; border-bottom: 1px solid var(--dsw-alias-border-secondary, rgba(0,0,0,.1)); display:flex; align-items:center; justify-content:space-between; }\n.iepms-attendance-header > div { display:flex; gap:10px; align-items:center; min-width:0; }.iepms-attendance-header h1,.iepms-attendance-header p { margin:0; }.iepms-attendance-header h1 { font-size:16px; line-height:21px; font-weight:650; letter-spacing:0; }.iepms-attendance-header p { font-size:12px; line-height:18px; color:var(--dsw-alias-label-secondary,#6b7280); }\n.iepms-attendance-back,.iepms-attendance-refresh { width:32px; height:32px; padding:0; border:0; background:transparent; color:inherit; display:grid; place-items:center; border-radius:6px; cursor:pointer; }.iepms-attendance-back:hover,.iepms-attendance-refresh:hover { background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06)); }.iepms-attendance-refresh:disabled { opacity:.45; cursor:default; }\n.iepms-attendance-trigger { height:34px; margin:4px 0; padding:6px 10px; display:flex; align-items:center; gap:8px; border:0; border-radius:6px; background:transparent; color:var(--dsw-alias-label-primary,#202124); font:inherit; font-size:14px; line-height:20px; cursor:pointer; }.iepms-attendance-trigger:hover,.iepms-attendance-trigger.is-active { background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06)); }.iepms-attendance-trigger.is-rail { width:36px; height:36px; margin:7px 0 3px; padding:0; justify-content:center; }\n.iepms-attendance-content { width:min(1180px,100%); margin:0 auto; padding:24px; box-sizing:border-box; display:grid; gap:18px; }.iepms-attendance-mode { min-height:40px; padding:0 12px; display:flex; align-items:center; gap:8px; border-left:3px solid #1389a9; background:var(--dsw-alias-bg-layer-2,rgba(19,137,169,.06)); color:var(--dsw-alias-label-primary,#202124); font-size:13px; }.iepms-attendance-mode > span { font-weight:650; }.iepms-attendance-mode p { margin:0; color:var(--dsw-alias-label-secondary,#6b7280); }\n.iepms-attendance-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }.iepms-attendance-metric { min-height:108px; padding:15px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); box-sizing:border-box; display:grid; align-content:start; gap:5px; }.iepms-attendance-metric p,.iepms-attendance-metric span { margin:0; font-size:12px; color:var(--dsw-alias-label-secondary,#6b7280); }.iepms-attendance-metric strong { font-size:22px; line-height:29px; letter-spacing:0; }.iepms-attendance-metric .is-good,.iepms-attendance-readiness .is-ready { color:#17803d; }.iepms-attendance-metric .is-warning,.iepms-attendance-readiness .is-missing { color:#a55d00; }\n.iepms-attendance-columns { display:grid; grid-template-columns:1.2fr .8fr; gap:12px; }.iepms-attendance-section { min-width:0; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; background:var(--dsw-alias-bg-layer-2,#fff); }.iepms-attendance-section > header { height:42px; padding:0 14px; display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); }.iepms-attendance-section h2 { margin:0; font-size:13px; line-height:18px; font-weight:650; }\n.iepms-attendance-events,.iepms-attendance-tasks,.iepms-attendance-readiness ul { margin:0; padding:0; list-style:none; }.iepms-attendance-events li { min-height:38px; padding:0 14px; display:grid; grid-template-columns:148px 1fr; gap:12px; align-items:center; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); font-size:13px; }.iepms-attendance-events li:last-child,.iepms-attendance-tasks li:last-child { border-bottom:0; }.iepms-attendance-events time { color:var(--dsw-alias-label-secondary,#6b7280); font-variant-numeric:tabular-nums; }.iepms-attendance-events .is-error span { color:#c13030; }.iepms-attendance-events .is-warning span { color:#a55d00; }\n.iepms-attendance-tasks li,.iepms-attendance-readiness li { min-height:42px; padding:0 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.08)); font-size:13px; }.iepms-attendance-tasks strong,.iepms-attendance-readiness strong { font-size:12px; font-weight:600; }.iepms-attendance-tasks .is-ready { color:#17803d; }.iepms-attendance-tasks .is-running { color:#1389a9; }.iepms-attendance-tasks .is-disabled { color:#a55d00; }.iepms-attendance-empty { padding:16px 14px; margin:0; color:var(--dsw-alias-label-secondary,#6b7280); font-size:13px; }.iepms-attendance-state { max-width:520px; margin:56px auto; padding:20px; border:1px solid var(--dsw-alias-border-secondary,rgba(0,0,0,.1)); border-radius:6px; }.iepms-attendance-state h2,.iepms-attendance-state p { margin:0; }.iepms-attendance-state h2 { font-size:16px; }.iepms-attendance-state p { margin-top:7px; color:var(--dsw-alias-label-secondary,#6b7280); font-size:13px; }.iepms-attendance-state button { margin-top:14px; min-height:30px; padding:5px 11px; border:0; border-radius:5px; background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.08)); color:inherit; font:inherit; cursor:pointer; }\n@media (max-width: 760px) { .iepms-attendance-header { padding:0 14px; }.iepms-attendance-content { padding:14px; }.iepms-attendance-summary,.iepms-attendance-columns { grid-template-columns:1fr; }.iepms-attendance-mode { align-items:flex-start; padding:10px 12px; flex-wrap:wrap; }.iepms-attendance-mode p { flex-basis:100%; margin-left:23px; }.iepms-attendance-events li { grid-template-columns:1fr; gap:1px; padding:8px 14px; } }\n";

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
  const [state, setState] = (0, import_react.useState)("loading");
  const [snapshot, setSnapshot] = (0, import_react.useState)();
  const [error, setError] = (0, import_react.useState)("");
  const load = (0, import_react.useCallback)(async (background = false) => {
    if (!background) setState("loading");
    setError("");
    try {
      const response = await fetch(`${API_PREFIX}/snapshot`, { headers: { accept: "application/json", [CLIENT_HEADER]: CLIENT_NAME } });
      const payload = await response.json().catch(() => void 0);
      if (!response.ok) throw new Error(payload !== void 0 && "error" in payload && typeof payload.error === "string" ? payload.error : "\u8003\u52E4\u72B6\u6001\u670D\u52A1\u6682\u4E0D\u53EF\u7528\u3002");
      if (!isSnapshot(payload)) throw new Error("\u8003\u52E4\u72B6\u6001\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\u3002");
      setSnapshot(payload);
      setState("ready");
    } catch (value) {
      setState("error");
      setError(value instanceof Error ? value.message : "\u8003\u52E4\u72B6\u6001\u8BFB\u53D6\u5931\u8D25\u3002");
    }
  }, []);
  (0, import_react.useEffect)(() => {
    void load();
  }, [load]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-attendance-workspace", "aria-labelledby": "iepms-attendance-title", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "iepms-attendance-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        workspace !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "iepms-attendance-back", onClick: workspace.close, "aria-label": "\u8FD4\u56DE\u5BF9\u8BDD", title: "\u8FD4\u56DE\u5BF9\u8BDD", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronLeftOutlineRegular, { size: 16 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconAlarmClockOutlineRegular, { size: 20 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { id: "iepms-attendance-title", children: "\u8003\u52E4\u76D1\u63A7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "iEPMS \u672C\u5730\u8FD0\u884C\u72B6\u6001" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "iepms-attendance-refresh", onClick: () => {
        void load();
      }, disabled: state === "loading", title: "\u5237\u65B0\u72B6\u6001", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconInspectOutlineRegular, { size: 16 }) })
    ] }),
    state === "loading" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelState, { title: "\u6B63\u5728\u8BFB\u53D6\u672C\u5730\u72B6\u6001", text: "\u4E0D\u4F1A\u767B\u5F55 iEPMS\uFF0C\u4E5F\u4E0D\u4F1A\u53D1\u9001\u901A\u77E5\u3002" }),
    state === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelState, { title: "\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u8003\u52E4\u72B6\u6001", text: error, retry: () => {
      void load();
    } }),
    state === "ready" && snapshot !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dashboard, { snapshot })
  ] });
}
function Dashboard({ snapshot }) {
  const config = snapshot.status.configuration;
  const data = snapshot.status.data;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-content", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "iepms-attendance-mode", role: "status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconDataOutlineRegular, { size: 15 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u53EA\u8BFB\u6A21\u5F0F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u6B64\u7248\u672C\u4E0D\u4F1A\u81EA\u52A8\u767B\u5F55\u3001\u5DE1\u68C0\u3001\u5BFC\u51FA\u6216\u53D1\u9001\u9489\u9489\u6D88\u606F\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-attendance-summary", "aria-label": "\u8FD0\u884C\u6982\u89C8", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, { label: "\u540E\u7AEF\u72B6\u6001", value: snapshot.status.application.backendRootAvailable ? "\u53EF\u7528" : "\u4E0D\u53EF\u7528", detail: `${snapshot.status.application.name} ${snapshot.status.application.version}`, good: snapshot.status.application.backendRootAvailable }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, { label: "\u82B1\u540D\u518C", value: data.rosterAvailable ? `${snapshot.roster.personCount} \u4EBA` : "\u672A\u627E\u5230", detail: data.rosterAvailable ? `${snapshot.roster.projectCount} \u4E2A\u9879\u76EE` : "\u8BF7\u68C0\u67E5\u672C\u5730 roster.xlsx", good: data.rosterAvailable }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, { label: "\u8BA1\u5212\u4EFB\u52A1", value: `${snapshot.schedule.tasks.length} \u9879`, detail: snapshot.schedule.message ?? "\u5DF2\u8BFB\u53D6\u672C\u5730 Windows \u8BA1\u5212\u4EFB\u52A1", good: snapshot.schedule.supported }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, { label: "\u914D\u7F6E\u72B6\u6001", value: config.valid ? "\u5DF2\u8BFB\u53D6" : "\u9700\u68C0\u67E5", detail: `${config.accountConfigured ? "\u8D26\u53F7\u5DF2\u914D\u7F6E" : "\u8D26\u53F7\u672A\u914D\u7F6E"} \xB7 ${config.browserConfigured ? "\u6D4F\u89C8\u5668\u5DF2\u914D\u7F6E" : "\u6D4F\u89C8\u5668\u672A\u914D\u7F6E"}`, good: config.valid && config.accountConfigured })
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "iepms-attendance-section iepms-attendance-readiness", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconInspectOutlineRegular, { size: 16 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u672C\u5730\u51C6\u5907\u72B6\u6001" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readiness, { label: "\u914D\u7F6E\u6587\u4EF6", ready: config.fileAvailable && config.valid }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readiness, { label: "\u672C\u5730\u8D26\u53F7\u914D\u7F6E", ready: config.accountConfigured }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readiness, { label: "\u901A\u77E5\u914D\u7F6E", ready: config.webhookConfigured }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readiness, { label: "\u8FD0\u884C\u65E5\u5FD7", ready: data.logAvailable }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readiness, { label: "\u6700\u8FD1\u5BFC\u51FA\u6570\u636E", ready: data.lastDataAvailable })
      ] })
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
function Readiness({ label, ready }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { className: ready ? "is-ready" : "is-missing", children: ready ? "\u5DF2\u5C31\u7EEA" : "\u5F85\u914D\u7F6E" })
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
