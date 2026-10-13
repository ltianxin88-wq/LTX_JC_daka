import { useCallback, useEffect, useState } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  IconAlarmClockOutlineRegular as IconAlarmClockOutline16,
  IconChevronLeftOutlineRegular as IconChevronLeftOutline16,
  IconClockOutlineRegular as IconClockOutline16,
  IconDataOutlineRegular as IconDataOutline16,
  IconInspectOutlineRegular as IconInspectOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { API_PREFIX, CLIENT_HEADER, CLIENT_NAME, PLUGIN_ID, type DashboardSnapshot } from './contracts.js'
import { activatePluginWorkspace, observePluginWorkspace } from './workspace-ownership.js'
import cssText from './client.css'

type SidebarActionProps = PropsRuntime<'sidebar.footer.action'>
type ConversationSlotProps = PropsRuntime<'main.conversation'>
const STYLE_ID = `${PLUGIN_ID}/client`
const ATTENDANCE_PANEL_ID = 'iepms-attendance-panel'

interface WorkspaceController {
  isOpen(): boolean
  toggle(): void
  close(): void
  subscribe(listener: () => void): () => void
}

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.effect(installStyles, 'iepms-attendance-plugin: client styles')
  const workspace = createWorkspaceController(ctx)
  ctx.effect(() => observePluginWorkspace(PLUGIN_ID, workspace.close), 'iepms-attendance-plugin: exclusive workspace')
  ctx.effect(() => () => { workspace.close() }, 'iepms-attendance-plugin: workspace lifecycle')
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'iepms-attendance', order: -9,
  }, props => <AttendanceLauncher {...props} workspace={workspace} />))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: ATTENDANCE_PANEL_ID as never, order: -9, label: () => '考勤监控',
  }, ({ size }: PropsRuntime<'sidebar.panellist'>) => <IconAlarmClockOutline16 size={size} />))
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: ATTENDANCE_PANEL_ID as never,
  }, () => <AttendancePanel />))
}

function createWorkspaceController(client: ClientContext): WorkspaceController {
  const listeners = new Set<() => void>()
  let disposeWorkspace: (() => void) | undefined
  const notify = (): void => { for (const listener of listeners) listener() }
  const close = (): void => {
    if (disposeWorkspace === undefined) return
    const dispose = disposeWorkspace
    disposeWorkspace = undefined
    dispose()
    notify()
  }
  const controller: WorkspaceController = {
    isOpen: () => disposeWorkspace !== undefined,
    toggle: () => {
      if (disposeWorkspace !== undefined) return close()
      activatePluginWorkspace(PLUGIN_ID)
      disposeWorkspace = client.slots.register({ name: 'main.conversation', priority: -1 }, props => (
        <AttendanceWorkspace {...props} workspace={controller} />
      ))
      notify()
    },
    close,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
  return controller
}

function AttendanceLauncher({ wide, workspace }: SidebarActionProps & { workspace: WorkspaceController }) {
  const [open, setOpen] = useState(workspace.isOpen())
  useEffect(() => workspace.subscribe(() => { setOpen(workspace.isOpen()) }), [workspace])
  return <button
    type="button"
    className={`iepms-attendance-trigger${wide ? '' : ' is-rail'}${open ? ' is-active' : ''}`}
    aria-label={open ? '返回对话' : '考勤监控'}
    aria-pressed={open}
    title={wide ? undefined : open ? '返回对话' : '考勤监控'}
    onClick={workspace.toggle}
  >
    <IconAlarmClockOutline16 size={wide ? 16 : 18} />
    {wide && <span>{open ? '返回对话' : '考勤监控'}</span>}
  </button>
}

function AttendanceWorkspace({ workspace }: ConversationSlotProps & { workspace: WorkspaceController }) {
  return <AttendancePanel workspace={workspace} />
}

function AttendancePanel({ workspace }: { workspace?: WorkspaceController }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>()
  const [error, setError] = useState('')
  const load = useCallback(async (background = false): Promise<void> => {
    if (!background) setState('loading')
    setError('')
    try {
      const response = await fetch(`${API_PREFIX}/snapshot`, { headers: { accept: 'application/json', [CLIENT_HEADER]: CLIENT_NAME } })
      const payload = await response.json().catch(() => undefined) as { error?: unknown } | DashboardSnapshot | undefined
      if (!response.ok) throw new Error(payload !== undefined && 'error' in payload && typeof payload.error === 'string' ? payload.error : '考勤状态服务暂不可用。')
      if (!isSnapshot(payload)) throw new Error('考勤状态服务返回了无效数据。')
      setSnapshot(payload)
      setState('ready')
    } catch (value) {
      setState('error')
      setError(value instanceof Error ? value.message : '考勤状态读取失败。')
    }
  }, [])
  useEffect(() => { void load() }, [load])
  return <section className="iepms-attendance-workspace" aria-labelledby="iepms-attendance-title">
    <header className="iepms-attendance-header">
      <div>
        {workspace !== undefined && <button type="button" className="iepms-attendance-back" onClick={workspace.close} aria-label="返回对话" title="返回对话"><IconChevronLeftOutline16 size={16} /></button>}
        <IconAlarmClockOutline16 size={20} />
        <span><h1 id="iepms-attendance-title">考勤监控</h1><p>iEPMS 本地运行状态</p></span>
      </div>
      <button type="button" className="iepms-attendance-refresh" onClick={() => { void load() }} disabled={state === 'loading'} title="刷新状态"><IconInspectOutline16 size={16} /></button>
    </header>
    {state === 'loading' && <PanelState title="正在读取本地状态" text="不会登录 iEPMS，也不会发送通知。" />}
    {state === 'error' && <PanelState title="暂时无法读取考勤状态" text={error} retry={() => { void load() }} />}
    {state === 'ready' && snapshot !== undefined && <Dashboard snapshot={snapshot} />}
  </section>
}

function Dashboard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const config = snapshot.status.configuration
  const data = snapshot.status.data
  return <div className="iepms-attendance-content">
    <div className="iepms-attendance-mode" role="status"><IconDataOutline16 size={15} /><span>只读模式</span><p>此版本不会自动登录、巡检、导出或发送钉钉消息。</p></div>
    <section className="iepms-attendance-summary" aria-label="运行概览">
      <Metric label="后端状态" value={snapshot.status.application.backendRootAvailable ? '可用' : '不可用'} detail={`${snapshot.status.application.name} ${snapshot.status.application.version}`} good={snapshot.status.application.backendRootAvailable} />
      <Metric label="花名册" value={data.rosterAvailable ? `${snapshot.roster.personCount} 人` : '未找到'} detail={data.rosterAvailable ? `${snapshot.roster.projectCount} 个项目` : '请检查本地 roster.xlsx'} good={data.rosterAvailable} />
      <Metric label="计划任务" value={`${snapshot.schedule.tasks.length} 项`} detail={snapshot.schedule.message ?? '已读取本地 Windows 计划任务'} good={snapshot.schedule.supported} />
      <Metric label="配置状态" value={config.valid ? '已读取' : '需检查'} detail={`${config.accountConfigured ? '账号已配置' : '账号未配置'} · ${config.browserConfigured ? '浏览器已配置' : '浏览器未配置'}`} good={config.valid && config.accountConfigured} />
    </section>
    <div className="iepms-attendance-columns">
      <section className="iepms-attendance-section"><header><IconClockOutline16 size={16} /><h2>近期状态</h2></header>
        {snapshot.recentRuns.length === 0 ? <Empty text="尚无可展示的本地运行摘要。" /> : <ol className="iepms-attendance-events">{snapshot.recentRuns.map((item, index) => <li key={`${item.timestamp}-${index}`} className={`is-${item.level}`}><time>{item.timestamp}</time><span>{item.summary}</span></li>)}</ol>}
      </section>
      <section className="iepms-attendance-section"><header><IconAlarmClockOutline16 size={16} /><h2>计划任务</h2></header>
        {snapshot.schedule.tasks.length === 0 ? <Empty text={snapshot.schedule.message ?? '没有已管理的计划任务。'} /> : <ul className="iepms-attendance-tasks">{snapshot.schedule.tasks.map(task => <li key={task.name}><span>{task.name}</span><strong className={`is-${task.state}`}>{taskStateLabel(task.state)}</strong></li>)}</ul>}
      </section>
    </div>
    <section className="iepms-attendance-section iepms-attendance-readiness"><header><IconInspectOutline16 size={16} /><h2>本地准备状态</h2></header><ul>
      <Readiness label="配置文件" ready={config.fileAvailable && config.valid} />
      <Readiness label="本地账号配置" ready={config.accountConfigured} />
      <Readiness label="通知配置" ready={config.webhookConfigured} />
      <Readiness label="运行日志" ready={data.logAvailable} />
      <Readiness label="最近导出数据" ready={data.lastDataAvailable} />
    </ul></section>
  </div>
}

function Metric({ label, value, detail, good }: { label: string; value: string; detail: string; good: boolean }) {
  return <article className="iepms-attendance-metric"><p>{label}</p><strong className={good ? 'is-good' : 'is-warning'}>{value}</strong><span>{detail}</span></article>
}

function Readiness({ label, ready }: { label: string; ready: boolean }) { return <li><span>{label}</span><strong className={ready ? 'is-ready' : 'is-missing'}>{ready ? '已就绪' : '待配置'}</strong></li> }
function Empty({ text }: { text: string }) { return <p className="iepms-attendance-empty">{text}</p> }
function PanelState({ title, text, retry }: { title: string; text: string; retry?: () => void }) { return <div className="iepms-attendance-state" role={retry === undefined ? 'status' : 'alert'}><h2>{title}</h2><p>{text}</p>{retry !== undefined && <button type="button" onClick={retry}>重试</button>}</div> }
function taskStateLabel(value: string): string { return value === 'ready' ? '就绪' : value === 'running' ? '运行中' : value === 'disabled' ? '已停用' : '未知' }
function isSnapshot(value: unknown): value is DashboardSnapshot { return value !== null && typeof value === 'object' && 'status' in value && 'roster' in value && 'schedule' in value && 'recentRuns' in value }

function installStyles(): () => void {
  document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${STYLE_ID}"]`)?.remove()
  const style = document.createElement('style')
  style.dataset.pluginCss = STYLE_ID
  style.textContent = cssText
  document.head.appendChild(style)
  return () => { style.remove() }
}
