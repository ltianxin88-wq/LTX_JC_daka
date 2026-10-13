const EVENT = 'iepms-attendance-plugin/workspace-activate'

export function activatePluginWorkspace(pluginId: string): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { pluginId } }))
}

export function observePluginWorkspace(pluginId: string, close: () => void): () => void {
  const listener = (event: Event): void => {
    if ((event as CustomEvent<{ pluginId?: unknown }>).detail?.pluginId !== pluginId) close()
  }
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
