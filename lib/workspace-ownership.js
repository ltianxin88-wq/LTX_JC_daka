const EVENT = 'iepms-attendance-plugin/workspace-activate';
export function activatePluginWorkspace(pluginId) {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { pluginId } }));
}
export function observePluginWorkspace(pluginId, close) {
    const listener = (event) => {
        if (event.detail?.pluginId !== pluginId)
            close();
    };
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
}
//# sourceMappingURL=workspace-ownership.js.map