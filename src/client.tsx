import { useCallback, useEffect, useState } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  IconAlarmClockOutlineRegular as IconAlarmClockOutline16,
  IconCheckCircleOutlineRegular as IconCheckCircleOutline16,
  IconChevronLeftOutlineRegular as IconChevronLeftOutline16,
  IconChevronRightOutlineRegular as IconChevronRightOutline16,
  IconChecklistOutlineRegular as IconChecklistOutline16,
  IconClockOutlineRegular as IconClockOutline16,
  IconDataOutlineRegular as IconDataOutline16,
  IconGaugeOutlineRegular as IconGaugeOutline16,
  IconInspectOutlineRegular as IconInspectOutline16,
  IconUserOutlineRegular as IconUserOutline16,
  IconWarningTriangleOutlineRegular as IconWarningTriangleOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  API_PREFIX, CLIENT_HEADER, CLIENT_NAME, PLUGIN_ID,
  MANAGEMENT_HEADER,
  type AttendanceReminderType, type ConfigurationUpdate, type ConfigurationView, type DashboardSnapshot, type ManagementAnalyticsPersonView, type ManagementAnalyticsRow, type ManagementAnalyticsView, type ManagementAuthorizationView, type ManagementRunView,
  type PersonalAttendanceRecord, type PersonalAttendanceStatus, type PersonalAttendanceView, type PersonalAutomationView, type PersonalMakeupView, type PersonalRosterView, type RuntimePreparationView,
  type RosterRow, type RosterTableView,
} from './contracts.js'
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
  const [view, setView] = useState<'management' | 'personal'>('personal')
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [managementAuthorization, setManagementAuthorization] = useState('')
  const [authorizationOpen, setAuthorizationOpen] = useState(false)
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>()
  const [configuration, setConfiguration] = useState<ConfigurationView>()
  const [error, setError] = useState('')
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimePreparationView>({ phase: 'idle', progress: 4, detail: '正在连接本地运行环境', updatedAt: '' })
  const [personalState, setPersonalState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [personal, setPersonal] = useState<PersonalAttendanceView>()
  const [personalAutomation, setPersonalAutomation] = useState<PersonalAutomationView>()
  const [personalMakeup, setPersonalMakeup] = useState<PersonalMakeupView>()
  const [personalError, setPersonalError] = useState('')
  const load = useCallback(async (authorization: string, background = false): Promise<void> => {
    if (!background) setState('loading')
    setError('')
    try {
      const [nextSnapshot, nextConfiguration] = await Promise.all([
        requestManagementApi<DashboardSnapshot>(authorization, 'snapshot'), requestManagementApi<ConfigurationView>(authorization, 'configuration'),
      ])
      if (!isSnapshot(nextSnapshot) || !isConfiguration(nextConfiguration)) throw new Error('考勤状态服务返回了无效数据。')
      setSnapshot(nextSnapshot)
      setConfiguration(nextConfiguration)
      setState('ready')
    } catch (value) {
      setState('error')
      setError(value instanceof Error ? value.message : '考勤状态读取失败。')
    }
  }, [])
  useEffect(() => {
    if (view === 'management' && managementAuthorization && state === 'idle') void load(managementAuthorization)
  }, [load, managementAuthorization, state, view])
  useEffect(() => {
    if (state !== 'loading') return
    let active = true
    const refreshStatus = (): void => {
      void requestApi<RuntimePreparationView>('runtime-status').then(value => {
        if (active && isRuntimePreparation(value)) setRuntimeStatus(value)
      }).catch(() => {})
    }
    refreshStatus()
    const timer = window.setInterval(refreshStatus, 700)
    return () => { active = false; window.clearInterval(timer) }
  }, [state])
  const loadPersonal = useCallback(async (background = false): Promise<void> => {
    if (!background) setPersonalState('loading')
    setPersonalError('')
    try {
      const [next, automation, makeup] = await Promise.all([
        requestApi<PersonalAttendanceView>('personal-attendance'),
        requestApi<PersonalAutomationView>('personal-automation'),
        requestApi<PersonalMakeupView>('personal-makeup'),
      ])
      if (!isPersonalAttendance(next) || !isPersonalAutomation(automation) || !isPersonalMakeup(makeup)) throw new Error('个人考勤服务返回了无效数据。')
      setPersonal(next)
      setPersonalAutomation(automation)
      setPersonalMakeup(makeup)
      setPersonalState('ready')
    } catch (value) {
      setPersonalState('error')
      setPersonalError(value instanceof Error ? value.message : '个人考勤读取失败。')
    }
  }, [])
  useEffect(() => { if (view === 'personal' && personalState === 'idle') void loadPersonal() }, [loadPersonal, personalState, view])
  useEffect(() => {
    if (view !== 'personal' || personalAutomation?.state !== 'running') return
    const timer = window.setInterval(() => { void loadPersonal(true) }, 3000)
    return () => { window.clearInterval(timer) }
  }, [loadPersonal, personalAutomation?.state, view])
  return <section
    className="iepms-attendance-workspace"
    aria-labelledby="iepms-attendance-title"
    onKeyDownCapture={event => { event.stopPropagation() }}
    onKeyUpCapture={event => { event.stopPropagation() }}
  >
    <header className="iepms-attendance-header">
      <div>
        {workspace !== undefined && <button type="button" className="iepms-attendance-back" onClick={workspace.close} aria-label="返回对话" title="返回对话"><IconChevronLeftOutline16 size={16} /></button>}
        <IconAlarmClockOutline16 size={20} />
        <span><h1 id="iepms-attendance-title">考勤监控</h1><p>{view === 'management' ? '管理版 · 插件状态与配置' : '个人版 · 我的出勤记录'}</p></span>
      </div>
      <div className="iepms-attendance-header-actions">
        <div className="iepms-attendance-view-switch" role="tablist" aria-label="考勤视图">
          <button type="button" role="tab" aria-selected={view === 'management'} className={view === 'management' ? 'is-active' : ''} onClick={() => { if (managementAuthorization) setView('management'); else setAuthorizationOpen(true) }}>管理版</button>
          <button type="button" role="tab" aria-selected={view === 'personal'} className={view === 'personal' ? 'is-active' : ''} onClick={() => { setView('personal') }}>个人版</button>
        </div>
        <button type="button" className="iepms-attendance-refresh" onClick={() => { void (view === 'management' ? load(managementAuthorization) : loadPersonal()) }} disabled={view === 'management' ? state === 'loading' : personalState === 'loading'} title="刷新状态"><IconInspectOutline16 size={16} /></button>
      </div>
    </header>
    <div className="iepms-attendance-scroll" tabIndex={0} aria-label="考勤监控内容">
      {view === 'management' && state === 'loading' && <RuntimePreparationState value={runtimeStatus} />}
      {view === 'management' && state === 'error' && <PanelState title="暂时无法读取考勤状态" text={error} retry={() => { void load(managementAuthorization) }} />}
      {view === 'management' && state === 'ready' && snapshot !== undefined && configuration !== undefined && <Dashboard
        snapshot={snapshot}
        configuration={configuration}
        authorization={managementAuthorization}
        onConfigurationSaved={next => { setConfiguration(next); void load(managementAuthorization, true) }}
      />}
      {view === 'personal' && (personalState === 'idle' || personalState === 'loading') && <PersonalSkeleton />}
      {view === 'personal' && personalState === 'error' && <PanelState title="暂时无法读取个人考勤" text={personalError} retry={() => { void loadPersonal() }} />}
      {view === 'personal' && personalState === 'ready' && personal !== undefined && personalAutomation !== undefined && personalMakeup !== undefined && <PersonalDashboard
        value={personal}
        automation={personalAutomation}
        onAccountSaved={next => { setPersonal(next); void loadPersonal(true) }}
        onAutomationChanged={setPersonalAutomation}
        makeup={personalMakeup}
      />}
    </div>
    {authorizationOpen && <ManagementAuthorizationDialog
      onCancel={() => { setAuthorizationOpen(false) }}
      onAuthorized={authorization => {
        setManagementAuthorization(authorization)
        setState('idle')
        setAuthorizationOpen(false)
        setView('management')
      }}
    />}
  </section>
}

function ManagementAuthorizationDialog({ onAuthorized, onCancel }: { onAuthorized: (token: string) => void; onCancel: () => void }) {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!code) return setError('请输入管理版授权码。')
    setSubmitting(true)
    setError('')
    try {
      const result = await requestApi<ManagementAuthorizationView>('management-authorize', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }),
      })
      if (typeof result.token !== 'string' || result.token.length < 32 || typeof result.expiresAt !== 'string') throw new Error('管理版授权服务返回了无效数据。')
      setCode('')
      onAuthorized(result.token)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '管理版授权失败。')
    } finally { setSubmitting(false) }
  }
  return <div className="iepms-management-auth-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !submitting) onCancel() }}>
    <section className="iepms-management-auth" role="dialog" aria-modal="true" aria-labelledby="iepms-management-auth-title">
      <header><IconInspectOutline16 size={19} /><div><h2 id="iepms-management-auth-title">管理版授权</h2><p>查看管理数据和配置前需要验证授权码</p></div></header>
      <form onSubmit={event => { void submit(event) }}>
        <label><span>授权码</span><input type="password" autoComplete="off" autoFocus value={code} disabled={submitting} onChange={event => { setCode(event.target.value); setError('') }} placeholder="请输入管理版授权码" /></label>
        {error && <p role="alert">{error}</p>}
        <div><button type="button" disabled={submitting} onClick={onCancel}>取消</button><button type="submit" className="is-primary" disabled={submitting || !code}>{submitting ? '验证中…' : '验证并进入'}</button></div>
      </form>
    </section>
  </div>
}

function Dashboard({ snapshot, configuration, authorization, onConfigurationSaved }: { snapshot: DashboardSnapshot; configuration: ConfigurationView; authorization: string; onConfigurationSaved: (value: ConfigurationView) => void }) {
  const [section, setSection] = useState<'overview' | 'analytics'>('overview')
  const statusConfig = snapshot.status.configuration
  const data = snapshot.status.data
  if (section === 'analytics') return <ManagementAnalytics authorization={authorization} onBack={() => { setSection('overview') }} />
  return <div className="iepms-attendance-content">
    <div className="iepms-attendance-mode" role="status"><IconDataOutline16 size={15} /><span>安全模式</span><p>仅在你点击保存时更新本地配置；不会自动登录、巡检、导出或发送钉钉消息。</p></div>
    <section className="iepms-attendance-summary" aria-label="运行概览">
      <Metric label="内置后端" value={snapshot.status.application.dataRootAvailable ? '可用' : '不可用'} detail={`${snapshot.status.application.name} · ${snapshot.status.application.version}`} good={snapshot.status.application.dataRootAvailable} />
      <Metric label="花名册" value={data.rosterAvailable ? `${snapshot.roster.personCount} 人` : '未找到'} detail={data.rosterAvailable ? `${snapshot.roster.projectCount} 个项目` : '请检查本地 roster.xlsx'} good={data.rosterAvailable} />
      <Metric label="计划任务" value={`${snapshot.schedule.tasks.length} 项`} detail={snapshot.schedule.message ?? '已读取本地 Windows 计划任务'} good={snapshot.schedule.supported} />
      <Metric label="配置状态" value={statusConfig.valid ? '已读取' : '需检查'} detail={`${statusConfig.accountConfigured ? '账号已配置' : '账号未配置'} · ${statusConfig.browserConfigured ? '浏览器已配置' : '浏览器未配置'}`} good={statusConfig.valid && statusConfig.accountConfigured} />
    </section>
    <ManagementOperations authorization={authorization} onAnalytics={() => { setSection('analytics') }} />
    <div className="iepms-attendance-columns">
      <section className="iepms-attendance-section"><header><IconClockOutline16 size={16} /><h2>近期状态</h2></header>
        {snapshot.recentRuns.length === 0 ? <Empty text="尚无可展示的本地运行摘要。" /> : <ol className="iepms-attendance-events">{snapshot.recentRuns.map((item, index) => <li key={`${item.timestamp}-${index}`} className={`is-${item.level}`}><time>{item.timestamp}</time><span>{item.summary}</span></li>)}</ol>}
      </section>
      <section className="iepms-attendance-section"><header><IconAlarmClockOutline16 size={16} /><h2>计划任务</h2></header>
        {snapshot.schedule.tasks.length === 0 ? <Empty text={snapshot.schedule.message ?? '没有已管理的计划任务。'} /> : <ul className="iepms-attendance-tasks">{snapshot.schedule.tasks.map(task => <li key={task.name}><span>{task.name}</span><strong className={`is-${task.state}`}>{taskStateLabel(task.state)}</strong></li>)}</ul>}
      </section>
    </div>
    <ConfigurationEditor authorization={authorization} value={configuration} onSaved={onConfigurationSaved} />
    <RosterManager authorization={authorization} />
    <section className="iepms-attendance-section iepms-attendance-readiness"><header><IconInspectOutline16 size={16} /><h2>本地准备状态</h2></header><ul>
      <Readiness label="配置文件" ready={statusConfig.fileAvailable && statusConfig.valid} />
      <Readiness label="本地账号配置" ready={statusConfig.accountConfigured} />
      <Readiness label="通知配置" ready={statusConfig.webhookConfigured} />
      <Readiness label="运行日志" ready={data.logAvailable} missingLabel="暂无数据" />
      <Readiness label="最近导出数据" ready={data.lastDataAvailable} missingLabel="暂无数据" />
    </ul></section>
  </div>
}

function ManagementOperations({ authorization, onAnalytics }: { authorization: string; onAnalytics: () => void }) {
  const [run, setRun] = useState<ManagementRunView>()
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [nextRun, nextLogs] = await Promise.all([
        requestManagementApi<ManagementRunView>(authorization, 'management-run'), requestManagementApi<string[]>(authorization, 'management-log'),
      ])
      if (!isManagementRun(nextRun) || !Array.isArray(nextLogs) || !nextLogs.every(line => typeof line === 'string')) throw new Error('管理巡检服务返回了无效数据。')
      setRun(nextRun)
      setLogs(nextLogs)
      setError('')
    } catch (value) {
      setError(value instanceof Error ? value.message : '无法读取管理巡检状态。')
    } finally { setLoading(false) }
  }, [authorization])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (run?.state !== 'running') return
    const timer = window.setInterval(() => { void refresh() }, 3000)
    return () => { window.clearInterval(timer) }
  }, [refresh, run?.state])
  const start = async (): Promise<void> => {
    if (!window.confirm('立即运行管理巡检？该操作会登录 iEPMS，并可能向已配置的钉钉 Webhook 发送通知。')) return
    setStarting(true)
    setError('')
    try {
      const next = await requestManagementApi<ManagementRunView>(authorization, 'management-run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      if (!isManagementRun(next)) throw new Error('管理巡检服务返回了无效数据。')
      setRun(next)
      await refresh()
    } catch (value) {
      setError(value instanceof Error ? value.message : '管理巡检启动失败。')
    } finally { setStarting(false) }
  }
  const running = run?.state === 'running'
  return <section className="iepms-attendance-section iepms-management-operations" aria-label="管理巡检">
    <header><IconGaugeOutline16 size={16} /><h2>管理巡检</h2><span className={`iepms-management-state is-${run?.state ?? 'idle'}`}>{running ? '执行中' : run?.state === 'success' ? '已完成' : run?.state === 'error' ? '执行失败' : '尚未执行'}</span><button type="button" className="iepms-management-analytics-entry" onClick={onAnalytics}>考勤运营分析</button><button type="button" disabled={loading || starting || running} onClick={() => { void start() }}>{starting || running ? '巡检中…' : '立即巡检'}</button></header>
    {run?.message && <p className={`iepms-management-message is-${run.state === 'error' ? 'error' : 'status'}`} role={run.state === 'error' ? 'alert' : 'status'}>{run.message}</p>}
    {error && <p className="iepms-management-message is-error" role="alert">{error}</p>}
    <div className="iepms-management-log"><div><strong>运行日志</strong><button type="button" onClick={() => { void refresh() }} disabled={loading}>刷新日志</button></div><pre>{logs.length > 0 ? logs.join('\n') : '暂无运行日志。'}</pre></div>
  </section>
}

function ManagementAnalytics({ authorization, onBack }: { authorization: string; onBack: () => void }) {
  const [month, setMonth] = useState(monthKey(new Date()))
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [sortBy, setSortBy] = useState('missing')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [value, setValue] = useState<ManagementAnalyticsView>()
  const [detail, setDetail] = useState<ManagementAnalyticsPersonView>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const next = await requestManagementApi<ManagementAnalyticsView>(authorization, analyticsPath('management-analytics', { month, name, group, page, pageSize: 20, sortBy, sortDirection }))
      if (!isManagementAnalytics(next)) throw new Error('考勤运营分析服务返回了无效数据。')
      setValue(next)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法读取考勤运营分析。')
    } finally { setLoading(false) }
  }, [authorization, group, month, name, page, sortBy, sortDirection])
  useEffect(() => { void load() }, [load])
  const updateFilter = (action: () => void): void => { setPage(1); action() }
  const openPerson = async (row: ManagementAnalyticsRow): Promise<void> => {
    try {
      const next = await requestManagementApi<ManagementAnalyticsPersonView>(authorization, analyticsPath('management-analytics-person', { month, personKey: row.personKey }))
      if (!isManagementAnalyticsPerson(next)) throw new Error('人员考勤详情返回无效。')
      setDetail(next)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '无法读取人员考勤详情。') }
  }
  const exportRows = async (): Promise<void> => {
    try {
      const rows: ManagementAnalyticsRow[] = []
      let exportPage = 1
      let total = 0
      do {
        const next = await requestManagementApi<ManagementAnalyticsView>(authorization, analyticsPath('management-analytics', { month, name, group, page: exportPage, pageSize: 100, sortBy, sortDirection }))
        if (!isManagementAnalytics(next)) throw new Error('导出数据返回无效。')
        rows.push(...next.rows)
        total = next.pagination.total
        exportPage += 1
      } while (rows.length < total)
      downloadAnalyticsCsv(month, rows)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '导出考勤明细失败。') }
  }
  const totalPages = value === undefined ? 1 : Math.max(1, Math.ceil(value.pagination.total / value.pagination.pageSize))
  return <div className="iepms-attendance-content iepms-analytics" aria-label="考勤运营分析">
    <header className="iepms-analytics-title"><button type="button" onClick={onBack}><IconChevronLeftOutline16 size={16} />返回管理概览</button><div><h2>考勤运营分析</h2><p>按管理巡检已同步的工作日统计，未同步日期不计为缺卡。</p></div><button type="button" className="iepms-analytics-export" onClick={() => { void exportRows() }} disabled={loading || value === undefined}>导出 Excel</button></header>
    <section className="iepms-analytics-filters" aria-label="分析筛选">
      <label>月份<input type="month" value={month} onChange={event => updateFilter(() => { setMonth(event.target.value || monthKey(new Date())) })} /></label>
      <label>姓名搜索<input value={name} placeholder="输入姓名" onChange={event => updateFilter(() => { setName(event.target.value) })} /></label>
      <label>项目/地市分组<select value={group} onChange={event => updateFilter(() => { setGroup(event.target.value) })}><option value="">全部分组</option>{value?.groups.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
      <button type="button" onClick={() => { void load() }} disabled={loading}>刷新数据</button>
    </section>
    {error && <p className="iepms-analytics-error" role="alert">{error}</p>}
    {loading && value === undefined && <div className="iepms-analytics-skeleton" />}
    {value !== undefined && <>
      <p className="iepms-analytics-coverage">数据覆盖：{value.coverage.coveredWorkdays} 个已同步工作日{value.coverage.firstDate ? `（${value.coverage.firstDate} 至 ${value.coverage.lastDate}）` : '。请先运行管理巡检以同步数据。'}</p>
      <section className="iepms-analytics-metrics" aria-label="核心数据">
        <AnalyticsMetric label="考勤总人数" value={`${value.metrics.personCount}`} detail="花名册有效人员" tone="blue" />
        <AnalyticsMetric label="整体出勤率" value={`${value.metrics.attendanceRate}%`} detail="仅基于已覆盖工作日" tone="green" />
        <AnalyticsMetric label="本月缺卡次数" value={`${value.metrics.missingCount}`} detail="原始缺卡记录" tone="red" />
        <AnalyticsMetric label="待补卡次数" value={`${value.metrics.pendingMakeupCount}`} detail="72 小时内或待处理申请" tone="orange" />
      </section>
      <section className="iepms-analytics-charts" aria-label="考勤图表">
        <article><header><h3>每日缺卡趋势</h3><span>待处理缺卡</span></header><AnalyticsTrend value={value} /></article>
        <article><header><h3>人员缺卡排行榜</h3><span>按缺卡次数</span></header><AnalyticsRanking value={value} /></article>
        <article><header><h3>考勤等级分布</h3><span>已覆盖人员</span></header><AnalyticsGradeDistribution value={value} /></article>
      </section>
      <section className="iepms-analytics-table-section"><header><div><h3>人员考勤明细</h3><span>{value.pagination.total} 人</span></div><label>排序<select value={sortBy} onChange={event => updateFilter(() => { setSortBy(event.target.value) })}><option value="missing">缺卡次数</option><option value="rate">出勤率</option><option value="pending">待补卡</option><option value="expired">超时未补卡</option><option value="name">姓名</option></select></label><button type="button" title="切换排序方向" onClick={() => updateFilter(() => { setSortDirection(current => current === 'desc' ? 'asc' : 'desc') })}>{sortDirection === 'desc' ? '降序' : '升序'}</button></header>
        <div className="iepms-analytics-table-wrap"><table><thead><tr><th>姓名</th><th>分组</th><th>应出勤</th><th>实际出勤</th><th>正常</th><th>缺卡</th><th>已补卡</th><th>待补卡</th><th>超时未补</th><th>迟到</th><th>早退</th><th>出勤率</th><th>等级</th></tr></thead><tbody>{value.rows.length === 0 ? <tr><td colSpan={13} className="iepms-analytics-empty-cell">当前筛选条件下暂无已同步的人员数据。</td></tr> : value.rows.map(row => <tr key={row.personKey}><td><button type="button" className="iepms-analytics-person" onClick={() => { void openPerson(row) }}>{row.name}</button></td><td>{row.group || row.city || '-'}</td><td>{row.expectedDays}</td><td>{row.actualDays}</td><td className="is-normal">{row.normalCount}</td><td className="is-danger">{row.missingCount}</td><td className="is-normal">{row.madeUpCount}</td><td className="is-warning">{row.pendingMakeupCount}</td><td className="is-danger">{row.expiredMissingCount}</td><td className="is-warning">{row.lateCount}</td><td className="is-warning">{row.earlyCount}</td><td>{row.expectedDays ? `${row.attendanceRate}%` : '-'}</td><td><span className={`iepms-analytics-grade is-${gradeTone(row.grade)}`}>{row.grade}</span></td></tr>)}</tbody></table></div>
        <footer><button type="button" disabled={page <= 1 || loading} onClick={() => { setPage(current => current - 1) }}><IconChevronLeftOutline16 size={14} /></button><span>第 {page} / {totalPages} 页</span><button type="button" disabled={page >= totalPages || loading} onClick={() => { setPage(current => current + 1) }}><IconChevronRightOutline16 size={14} /></button></footer>
      </section>
    </>}
    {detail !== undefined && <AnalyticsPersonDetail value={detail} onClose={() => { setDetail(undefined) }} />}
  </div>
}

function AnalyticsMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'blue' | 'green' | 'orange' | 'red' }) { return <article className={`iepms-analytics-metric is-${tone}`}><p>{label}</p><strong>{value}</strong><span>{detail}</span></article> }
function AnalyticsTrend({ value }: { value: ManagementAnalyticsView }) {
  const points = value.trend
  const max = Math.max(1, ...points.map(item => item.missingCount))
  const path = points.map((item, index) => `${index === 0 ? 'M' : 'L'} ${points.length <= 1 ? 20 : 12 + index * 276 / (points.length - 1)} ${96 - item.missingCount * 76 / max}`).join(' ')
  return points.length === 0 ? <p className="iepms-chart-empty">暂无已同步工作日数据</p> : <div className="iepms-trend"><svg viewBox="0 0 300 112" role="img" aria-label="每日缺卡趋势"><path className="iepms-trend-grid" d="M 12 20 H 288 M 12 58 H 288 M 12 96 H 288" /><path className="iepms-trend-line" d={path} />{points.map((item, index) => <circle key={item.date} cx={points.length <= 1 ? 20 : 12 + index * 276 / (points.length - 1)} cy={96 - item.missingCount * 76 / max} r="3" />)}</svg><div>{points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 4) === 0).map(item => <span key={item.date}>{item.date.slice(5)}</span>)}</div></div>
}
function AnalyticsRanking({ value }: { value: ManagementAnalyticsView }) { const max = Math.max(1, ...value.ranking.map(item => item.missingCount)); return value.ranking.length === 0 ? <p className="iepms-chart-empty">暂无缺卡排行</p> : <ol className="iepms-ranking">{value.ranking.map(item => <li key={`${item.name}-${item.group}`}><span title={item.group}>{item.name}</span><div><i style={{ width: `${item.missingCount * 100 / max}%` }} /></div><strong>{item.missingCount}</strong></li>)}</ol> }
function AnalyticsGradeDistribution({ value }: { value: ManagementAnalyticsView }) { const total = Math.max(1, value.gradeDistribution.reduce((sum, item) => sum + item.count, 0)); return <div className="iepms-grade-distribution">{value.gradeDistribution.map(item => <div key={item.grade}><span>{item.grade}</span><div><i className={`is-${gradeTone(item.grade)}`} style={{ width: `${item.count * 100 / total}%` }} /></div><strong>{item.count} 人</strong></div>)}</div> }
function AnalyticsPersonDetail({ value, onClose }: { value: ManagementAnalyticsPersonView; onClose: () => void }) {
  const byDate = new Map(value.records.map(record => [record.date, record]))
  return <aside className="iepms-analytics-detail" aria-label="人员月度考勤详情"><header><div><h3>{value.person.name} 的月度考勤</h3><p>{value.month} · {value.person.group || value.person.city || '未分组'}</p></div><button type="button" onClick={onClose} aria-label="关闭人员详情">关闭</button></header><div className="iepms-detail-calendar"><div className="iepms-detail-week"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div><div className="iepms-detail-days">{calendarCells(value.month).map((cell, index) => cell === undefined ? <span key={`empty-${index}`} /> : <div key={cell.date} className={`is-${byDate.get(cell.date)?.status ?? 'unknown'}`}><strong>{cell.day}</strong><small>{detailStatusLabel(byDate.get(cell.date))}</small></div>)}</div></div><section><h4>异常记录</h4>{value.anomalies.length === 0 ? <p>本月已同步记录中没有异常。</p> : <ul>{value.anomalies.map(item => <li key={item.date}><time>{item.date}</time><span>{detailStatusLabel(item)}{item.resolution === undefined ? '' : ` · ${item.resolution === 'made-up' ? '已补卡' : item.resolution === 'pending' ? '待补卡' : '超时未补卡'}`}</span><small>{item.clockIn || '-'} / {item.clockOut || '-'}</small></li>)}</ul>}</section></aside>
}

function PersonalDashboard({ value, automation, makeup, onAccountSaved, onAutomationChanged }: { value: PersonalAttendanceView; automation: PersonalAutomationView; makeup: PersonalMakeupView; onAccountSaved: (value: PersonalAttendanceView) => void; onAutomationChanged: (value: PersonalAutomationView) => void }) {
  const today = new Date()
  const currentMonth = monthKey(today)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const records = value.records.filter(record => record.date.startsWith(`${selectedMonth}-`))
  const recordByDate = new Map(records.map(record => [record.date, record]))
  const workdayDates = new Set(value.calendar.workdays)
  const isWorkday = (date: string): boolean => workdayDates.has(date)
  const todayDate = dateKey(today)
  const todayRecord = isWorkday(todayDate) ? value.records.find(record => record.date === todayDate) : undefined
  const workingRecords = records.filter(record => isWorkday(record.date))
  const attendanceDays = workingRecords.filter(record => record.status !== 'missing' && record.status !== 'pending').length
  const normalPunches = workingRecords.filter(record => record.status === 'normal' || record.status === 'checked-in').reduce((total, record) => total + Number(Boolean(record.clockIn)) + Number(Boolean(record.clockOut)), 0)
  const late = workingRecords.filter(record => record.status === 'late').length
  const early = workingRecords.filter(record => record.status === 'early').length
  const missing = workingRecords.filter(record => record.status === 'missing').length
  const expectedDays = expectedWorkdays(selectedMonth, currentMonth, workdayDates)
  const attendanceRate = expectedDays === 0 ? 0 : Math.min(100, Math.round(attendanceDays / expectedDays * 100))
  const anomalyCount = late + early + missing
  const recent = [...value.records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  return <div className="iepms-personal-content">
    <PersonalAccountEditor value={value} onSaved={onAccountSaved} />
    <PersonalRosterEditor key={value.accountMasked || 'unconfigured'} configured={value.configured} accountMasked={value.accountMasked} />
    <PersonalAutomationPanel value={automation} onChanged={onAutomationChanged} />
    {value.configured && !value.source.latestAvailable && <div className="iepms-personal-notice"><IconDataOutline16 size={15} /><span>暂无该账号的考勤数据。完成一次巡检后，个人版会从本地结果中整理记录。</span></div>}
    <section className="iepms-personal-metrics" aria-label="个人考勤概览">
      <PersonalMetric icon={<IconAlarmClockOutline16 size={17} />} label="今日状态" value={!isWorkday(todayDate) ? '休' : todayRecord === undefined ? '暂无记录' : personalStatusLabel(todayRecord.status)} detail={!isWorkday(todayDate) ? '非工作日不计入考勤统计' : todayRecord === undefined ? '等待本地巡检数据' : `上班 ${todayRecord.clockIn || '-'} / 下班 ${todayRecord.clockOut || '-'}`} tone={!isWorkday(todayDate) ? 'muted' : statusTone(todayRecord?.status)} />
      <PersonalMetric icon={<IconGaugeOutline16 size={17} />} label="本月出勤" value={`${attendanceDays}天`} detail={`工作日估算 ${expectedDays} 天`} tone="blue" />
      <PersonalMetric icon={<IconCheckCircleOutline16 size={17} />} label="正常打卡" value={`${normalPunches}次`} detail={`出勤率 ${attendanceRate}%`} tone="green" />
      <PersonalMetric icon={<IconWarningTriangleOutline16 size={17} />} label="异常记录" value={`${anomalyCount}次`} detail={`迟到 ${late} 次 · 早退 ${early} 次 · 缺卡 ${missing} 次`} tone={anomalyCount > 0 ? 'orange' : 'muted'} />
    </section>
    <div className="iepms-personal-grid">
      <section className="iepms-personal-card iepms-personal-calendar"><header><span><IconAlarmClockOutline16 size={16} /><h2>月度打卡日历</h2></span><div><button type="button" aria-label="上个月" onClick={() => { setSelectedMonth(shiftMonth(selectedMonth, -1)) }}><IconChevronLeftOutline16 size={15} /></button><strong>{selectedMonth.replace('-', '年')}月</strong><button type="button" aria-label="下个月" disabled={selectedMonth >= currentMonth} onClick={() => { setSelectedMonth(shiftMonth(selectedMonth, 1)) }}><IconChevronRightOutline16 size={15} /></button></div></header>
        <div className="iepms-calendar-weekdays" aria-hidden="true">{['日', '一', '二', '三', '四', '五', '六'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="iepms-calendar-days">{calendarCells(selectedMonth).map((cell, index) => {
          if (cell === undefined) return <div key={`empty-${index}`} className="iepms-calendar-day is-empty" aria-hidden="true" />
          const record = recordByDate.get(cell.date)
          const workday = isWorkday(cell.date)
          const isToday = cell.date === todayDate
          const reminder = record?.status === 'missing' ? undefined : makeupReminderForDate(cell.date, makeup)
          const className = `iepms-calendar-day${workday ? '' : ' is-rest'}${isToday ? ' is-today' : ''}${reminder === undefined ? '' : ` is-${reminder}-reminder`}`
          const label = record?.status === 'missing' && workday ? '缺卡' : reminder === 'makeup' ? '可补卡' : reminder === 'overtime' ? '可加班补卡' : workday ? undefined : '休'
          const restStyle = !workday && reminder === undefined ? { background: 'rgba(127,139,152,.045)' } : undefined
          return <div key={cell.date} className={className} style={restStyle} title={label === undefined ? record === undefined ? cell.date : `${cell.date} ${personalStatusLabel(record.status)}` : `${cell.date} ${label}`}><span>{cell.day}</span>{record !== undefined && workday && <i className={`is-${record.status}`} aria-label={personalStatusLabel(record.status)} />}{label !== undefined && <b style={!workday ? { color: '#7b8491' } : undefined}>{label}</b>}</div>
        })}</div>
        <div className="iepms-calendar-legend"><span><i className="is-normal" />正常</span><span><i className="is-late" />迟到/早退</span><span><i className="is-missing" />缺卡</span><span><i className="is-pending" />进行中</span><span><i className="is-rest" />休</span></div>
        <div className="iepms-calendar-makeup-legend" aria-label="补卡提醒图例"><strong>补卡提醒：</strong><span><i className="is-makeup" />可补卡</span><span><i className="is-overtime" />可加班补卡</span><small>缺卡后 72 小时内可补卡；超过 72 小时显示加班补卡提醒。</small></div>
      </section>
      <section className="iepms-personal-card iepms-personal-stats"><header><IconGaugeOutline16 size={16} /><h2>月度考勤统计</h2></header>
        <StatRow label="出勤天数" value={`${attendanceDays}天`} amount={expectedDays === 0 ? 0 : attendanceDays / expectedDays} detail={`${attendanceDays} / ${expectedDays}`} tone="blue" />
        <StatRow label="正常打卡" value={`${normalPunches}次`} amount={attendanceDays === 0 ? 0 : normalPunches / (attendanceDays * 2)} detail={`${Math.round(attendanceDays === 0 ? 0 : normalPunches / (attendanceDays * 2) * 100)}%`} tone="green" />
        <StatRow label="迟到" value={`${late}次`} amount={expectedDays === 0 ? 0 : late / expectedDays} detail={`${Math.round(expectedDays === 0 ? 0 : late / expectedDays * 100)}%`} tone="orange" />
        <StatRow label="早退" value={`${early}次`} amount={expectedDays === 0 ? 0 : early / expectedDays} detail={`${Math.round(expectedDays === 0 ? 0 : early / expectedDays * 100)}%`} tone="orange" />
        <StatRow label="缺卡" value={`${missing}次`} amount={expectedDays === 0 ? 0 : missing / expectedDays} detail={`${Math.round(expectedDays === 0 ? 0 : missing / expectedDays * 100)}%`} tone="red" />
        <StatRow label="出勤率" value={`${attendanceRate}%`} amount={attendanceRate / 100} detail={`${attendanceRate}%`} tone="blue" />
      </section>
    </div>
    <section className="iepms-personal-card iepms-personal-records"><header><IconChecklistOutline16 size={16} /><h2>最近打卡记录</h2><span>{value.configured ? `账号 ${value.accountMasked}` : '尚未配置账号'}</span></header>
      {recent.length === 0 ? <Empty text="暂无本地个人记录。巡检生成当日明细后会显示在这里。" /> : <div className="iepms-personal-table-wrap"><table><thead><tr><th>日期</th><th>上班时间</th><th>下班时间</th><th>工时</th><th>状态</th></tr></thead><tbody>{recent.map(record => <tr key={record.date}><td>{record.date.slice(5)}</td><td>{record.clockIn || '-'}</td><td>{record.clockOut || '-'}</td><td>{formatWorkMinutes(record.workMinutes)}</td><td><strong className={`is-${record.status}`}>{personalStatusLabel(record.status)}</strong></td></tr>)}</tbody></table></div>}
    </section>
  </div>
}

function PersonalAccountEditor({ value, onSaved }: { value: PersonalAttendanceView; onSaved: (value: PersonalAttendanceView) => void }) {
  const [editing, setEditing] = useState(!value.configured)
  const [account, setAccount] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string }>()
  useEffect(() => { if (!value.configured) setEditing(true) }, [value.configured])
  const save = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const normalized = account.trim()
    if (!normalized) return setMessage({ kind: 'error', text: '请填写个人考勤账号。' })
    setSaving(true)
    setMessage(undefined)
    try {
      const next = await requestApi<PersonalAttendanceView>('personal-account', {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ account: normalized }),
      })
      if (!isPersonalAttendance(next)) throw new Error('个人账号服务返回了无效数据。')
      setAccount('')
      setEditing(false)
      setMessage({ kind: 'success', text: '个人账号已保存，已重新匹配本地考勤记录。' })
      onSaved(next)
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '个人账号保存失败。' })
    } finally { setSaving(false) }
  }
  if (!editing && value.configured) return <section className="iepms-personal-account is-configured" aria-label="个人账号设置">
    <IconUserOutline16 size={16} />
    <div><strong>个人考勤账号</strong><span>已配置 {value.accountMasked} · 仅用于匹配本地巡检结果</span></div>
    {message !== undefined && <p className={`is-${message.kind}`} role="status">{message.text}</p>}
    <button type="button" onClick={() => { setEditing(true); setMessage(undefined) }}>更换账号</button>
  </section>
  return <section className="iepms-personal-account" aria-label="个人账号设置">
    <div className="iepms-personal-account-intro"><IconUserOutline16 size={17} /><span><strong>{value.configured ? '更换个人考勤账号' : '配置个人考勤账号'}</strong><small>只需填写账号，用于匹配本地巡检结果，不参与登录。</small></span></div>
    <form onSubmit={event => { void save(event) }}>
      <label htmlFor="iepms-personal-account-input">个人账号</label>
      <input id="iepms-personal-account-input" autoComplete="username" maxLength={100} value={account} onChange={event => { setAccount(event.target.value) }} placeholder={value.configured ? `当前：${value.accountMasked}` : '请输入工号或打卡账号'} autoFocus={!value.configured} />
      <div className="iepms-personal-account-actions">
        {value.configured && <button type="button" className="is-secondary" onClick={() => { setEditing(false); setAccount(''); setMessage(undefined) }}>取消</button>}
        <button type="submit" disabled={saving}>{saving ? '保存中…' : '保存账号'}</button>
      </div>
    </form>
    {message !== undefined && <p className={`iepms-personal-account-message is-${message.kind}`} role="alert">{message.text}</p>}
  </section>
}

function blankRosterRow(): RosterRow {
  return { rowId: '', projectName: '', projectCode: '', name: '', city: '', account: '', mobile: '', dingtalkId: '', webhookConfigured: false }
}

function RosterManager({ authorization }: { authorization: string }) {
  const [rows, setRows] = useState<RosterRow[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [backupAvailable, setBackupAvailable] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string }>()
  const load = useCallback(async (): Promise<void> => {
    setState('loading')
    try {
      const value = await requestManagementApi<RosterTableView>(authorization, 'roster')
      if (!isRosterTable(value)) throw new Error('花名册服务返回了无效数据。')
      setRows(value.rows)
      setBackupAvailable(value.backupAvailable)
      setDirty(false)
      setState('ready')
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '花名册读取失败。' })
      setState('error')
    }
  }, [authorization])
  useEffect(() => { void load() }, [load])
  const update = (rowId: string, index: number, key: keyof RosterRow, value: string | boolean): void => {
    setRows(current => current.map((row, rowIndex) => row.rowId === rowId && rowId ? { ...row, [key]: value } : rowIndex === index ? { ...row, [key]: value } : row))
    setDirty(true)
  }
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = rows.map((row, index) => ({ row, index })).filter(({ row }) => !normalizedSearch || [row.projectName, row.projectCode, row.name, row.city, row.account, row.mobile, row.dingtalkId].some(value => value.toLowerCase().includes(normalizedSearch)))
  const pageSize = 15
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)
  const save = async (): Promise<void> => {
    setSaving(true)
    setMessage(undefined)
    try {
      const value = await requestManagementApi<RosterTableView>(authorization, 'roster', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows }) })
      if (!isRosterTable(value)) throw new Error('花名册服务返回了无效数据。')
      setRows(value.rows)
      setBackupAvailable(value.backupAvailable)
      setDirty(false)
      setMessage({ kind: 'success', text: `花名册已保存，共 ${value.rows.length} 行。` })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '花名册保存失败。' })
    } finally { setSaving(false) }
  }
  return <section className="iepms-attendance-section iepms-roster-manager" aria-label="员工花名册管理">
    <header><IconChecklistOutline16 size={16} /><h2>员工花名册</h2><span>{state === 'ready' ? `${rows.length} 行${backupAvailable ? ' · 已保留上次备份' : ''}` : '正在读取'}</span><button type="button" onClick={() => { setRows(current => [...current, blankRosterRow()]); setPage(Math.floor(rows.length / pageSize)); setDirty(true) }}>新增一行</button><button type="button" className="is-primary" disabled={!dirty || saving || state !== 'ready'} onClick={() => { void save() }}>{saving ? '保存中…' : '保存花名册'}</button></header>
    <div className="iepms-roster-toolbar"><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} placeholder="搜索项目、姓名、地市或账号" /><p>Webhook 原文不回显；留空保留，点击清除后保存才会删除。</p></div>
    {state === 'error' ? <div className="iepms-roster-error"><p>{message?.text}</p><button type="button" onClick={() => { void load() }}>重试</button></div> : <div className="iepms-roster-table-wrap"><table><thead><tr><th>项目名称*</th><th>项目号</th><th>姓名*</th><th>地市</th><th>打卡账号*</th><th>手机号</th><th>钉钉号</th><th>钉钉 Webhook</th><th>操作</th></tr></thead><tbody>{visible.map(({ row, index }) => <tr key={row.rowId || `new-${index}`}>
      <td><input value={row.projectName} onChange={event => { update(row.rowId, index, 'projectName', event.target.value) }} /></td>
      <td><input value={row.projectCode} onChange={event => { update(row.rowId, index, 'projectCode', event.target.value) }} /></td>
      <td><input value={row.name} onChange={event => { update(row.rowId, index, 'name', event.target.value) }} /></td>
      <td><input value={row.city} onChange={event => { update(row.rowId, index, 'city', event.target.value) }} /></td>
      <td><input value={row.account} onChange={event => { update(row.rowId, index, 'account', event.target.value) }} /></td>
      <td><input value={row.mobile} onChange={event => { update(row.rowId, index, 'mobile', event.target.value) }} /></td>
      <td><input value={row.dingtalkId} onChange={event => { update(row.rowId, index, 'dingtalkId', event.target.value) }} /></td>
      <td><div className="iepms-roster-webhook"><input type="password" value={row.webhook ?? ''} onChange={event => { update(row.rowId, index, 'webhook', event.target.value) }} placeholder={row.webhookConfigured ? '已配置，留空保留' : '未配置'} />{row.webhookConfigured && row.webhook === undefined && <button type="button" onClick={() => { update(row.rowId, index, 'webhook', ''); update(row.rowId, index, 'webhookConfigured', false) }}>清除</button>}</div></td>
      <td><button type="button" className="iepms-roster-delete" onClick={() => { setRows(current => current.filter((_, rowIndex) => rowIndex !== index)); setDirty(true) }}>删除</button></td>
    </tr>)}</tbody></table>{state === 'loading' && <p className="iepms-attendance-empty">正在读取花名册…</p>}{state === 'ready' && visible.length === 0 && <p className="iepms-attendance-empty">没有匹配的花名册数据。</p>}</div>}
    <footer><span>第 {safePage + 1} / {pageCount} 页 · 当前筛选 {filtered.length} 行</span><div><button type="button" disabled={safePage === 0} onClick={() => { setPage(value => Math.max(0, value - 1)) }}>上一页</button><button type="button" disabled={safePage >= pageCount - 1} onClick={() => { setPage(value => Math.min(pageCount - 1, value + 1)) }}>下一页</button></div></footer>
    {message !== undefined && state !== 'error' && <p className={`iepms-roster-message is-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
  </section>
}

function PersonalRosterEditor({ configured, accountMasked }: { configured: boolean; accountMasked: string }) {
  const [row, setRow] = useState<RosterRow>(blankRosterRow())
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(configured ? 'loading' : 'ready')
  const [editing, setEditing] = useState(false)
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string }>()
  useEffect(() => {
    if (!configured) return
    void requestApi<PersonalRosterView>('personal-roster').then(value => {
      if (!isPersonalRoster(value)) throw new Error('个人资料服务返回了无效数据。')
      setRow(value.row ?? blankRosterRow())
      setDuplicateCount(value.duplicateCount)
      setEditing(value.row === null)
      setState('ready')
    }).catch(error => { setState('error'); setMessage({ kind: 'error', text: error instanceof Error ? error.message : '个人资料读取失败。' }) })
  }, [configured])
  const change = (key: keyof RosterRow, value: string | boolean): void => { setRow(current => ({ ...current, [key]: value })) }
  const save = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setSaving(true)
    setMessage(undefined)
    try {
      const value = await requestApi<PersonalRosterView>('personal-roster', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ row }) })
      if (!isPersonalRoster(value) || value.row === null) throw new Error('个人资料服务返回了无效数据。')
      setRow(value.row)
      setDuplicateCount(value.duplicateCount)
      setEditing(false)
      setMessage({ kind: 'success', text: '个人花名册资料已保存。' })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '个人资料保存失败。' })
    } finally { setSaving(false) }
  }
  if (!configured) return null
  if (state === 'loading') return <section className="iepms-personal-profile"><p>正在读取个人花名册资料…</p></section>
  if (!editing && state === 'ready') return <section className="iepms-personal-profile is-summary" aria-label="个人花名册资料"><IconChecklistOutline16 size={16} /><div><strong>个人花名册资料</strong><span>{row.name || '未填写姓名'} · {row.projectName || '未填写项目'} · 账号 {accountMasked}</span></div>{message !== undefined && <p className={`is-${message.kind}`}>{message.text}</p>}<button type="button" onClick={() => { setEditing(true); setMessage(undefined) }}>编辑资料</button></section>
  return <section className="iepms-personal-profile" aria-label="个人花名册资料"><header><IconChecklistOutline16 size={16} /><span><strong>个人花名册资料</strong><small>只维护账号 {accountMasked} 对应的一行</small></span></header><p className="iepms-personal-profile-help">个人信息请联系对应办事处人事或项目经理获取。</p><form onSubmit={event => { void save(event) }}>
    <label><span>项目名称*</span><input value={row.projectName} onChange={event => { change('projectName', event.target.value) }} /></label>
    <label><span>项目号</span><input value={row.projectCode} onChange={event => { change('projectCode', event.target.value) }} /></label>
    <label><span>姓名*</span><input value={row.name} onChange={event => { change('name', event.target.value) }} /></label>
    <label><span>地市</span><input value={row.city} onChange={event => { change('city', event.target.value) }} /></label>
    <label><span>手机号</span><input value={row.mobile} onChange={event => { change('mobile', event.target.value) }} /></label>
    <label><span>钉钉号</span><input value={row.dingtalkId} onChange={event => { change('dingtalkId', event.target.value) }} /></label>
    <div className="iepms-personal-profile-actions">{row.rowId && <button type="button" className="is-secondary" onClick={() => { setEditing(false); setMessage(undefined) }}>取消</button>}<button type="submit" disabled={saving || duplicateCount > 1}>{saving ? '保存中…' : '保存个人资料'}</button></div>
  </form>{duplicateCount > 1 && <p className="iepms-personal-profile-message is-error">当前账号存在 {duplicateCount} 行，请先到管理版合并。</p>}{message !== undefined && <p className={`iepms-personal-profile-message is-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}</section>
}

function PersonalAutomationPanel({ value, onChanged }: { value: PersonalAutomationView; onChanged: (value: PersonalAutomationView) => void }) {
  const initialTimes = value.schedule.times.length > 0 ? value.schedule.times : ['09:15', '18:15']
  const [enabled, setEnabled] = useState(value.schedule.enabled)
  const [morningTime, setMorningTime] = useState(initialTimes[0] ?? '09:15')
  const [eveningTime, setEveningTime] = useState(initialTimes[1] ?? '18:15')
  const [starting, setStarting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingReminders, setSavingReminders] = useState(false)
  const [reminders, setReminders] = useState(value.reminders)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string }>()
  useEffect(() => {
    setEnabled(value.schedule.enabled)
    if (value.schedule.times[0]) setMorningTime(value.schedule.times[0])
    if (value.schedule.times[1]) setEveningTime(value.schedule.times[1])
    setReminders(value.reminders)
  }, [value.schedule.enabled, value.schedule.times.join('|'), JSON.stringify(value.reminders)])
  const ready = value.accountConfigured && value.loginReady
  const running = value.state === 'running'
  const start = async (): Promise<void> => {
    setStarting(true)
    setMessage(undefined)
    try {
      const next = await requestApi<PersonalAutomationView>('personal-run', { method: 'POST' })
      if (!isPersonalAutomation(next)) throw new Error('个人巡检服务返回了无效数据。')
      onChanged(next)
      setMessage({ kind: 'success', text: '个人巡检已启动，完成后页面会自动刷新。' })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '个人巡检启动失败。' })
    } finally { setStarting(false) }
  }
  const saveSchedule = async (): Promise<void> => {
    const times = [morningTime, eveningTime].map(item => item.trim()).filter(Boolean)
    if (enabled && times.length === 0) return setMessage({ kind: 'error', text: '请至少设置一个巡检时间。' })
    setSaving(true)
    setMessage(undefined)
    try {
      const next = await requestApi<PersonalAutomationView>('personal-schedule', {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled, times }),
      })
      if (!isPersonalAutomation(next)) throw new Error('个人定时服务返回了无效数据。')
      onChanged(next)
      setMessage({ kind: 'success', text: enabled ? '个人定时巡检已更新。' : '个人定时巡检已停用。' })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '个人定时巡检保存失败。' })
    } finally { setSaving(false) }
  }
  const saveReminders = async (): Promise<void> => {
    setSavingReminders(true)
    setMessage(undefined)
    try {
      const next = await requestApi<PersonalAutomationView>('personal-reminders', {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(reminders),
      })
      if (!isPersonalAutomation(next)) throw new Error('个人提醒服务返回了无效数据。')
      onChanged(next)
      setMessage({ kind: 'success', text: '启动巡检与提醒设置已保存。' })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '个人提醒设置保存失败。' })
    } finally { setSavingReminders(false) }
  }
  const stateText = running ? '执行中' : value.state === 'success' ? '上次成功' : value.state === 'error' ? '上次失败' : '尚未执行'
  return <section className="iepms-personal-automation" aria-label="个人巡检设置">
    <header>
      <div><IconInspectOutline16 size={17} /><span><strong>个人巡检</strong><small>仅同步当前个人账号，结果只在插件内提醒</small></span></div>
      <div className={`iepms-personal-run-state is-${value.state}`}><i />{stateText}{value.lastCompletedAt && <time>{value.lastCompletedAt.replace('T', ' ')}</time>}</div>
      <button type="button" className="iepms-personal-run-now" disabled={!ready || running || starting} onClick={() => { void start() }}>{running || starting ? '巡检中…' : '立即巡检'}</button>
    </header>
    <div className="iepms-personal-schedule">
      <label className="iepms-personal-schedule-toggle"><input type="checkbox" checked={enabled} disabled={!ready || saving} onChange={event => { setEnabled(event.target.checked) }} /><span><strong>定时巡检</strong><small>工作日到点自动同步</small></span></label>
      <label><span>上班同步</span><input type="time" value={morningTime} disabled={!ready || !enabled || saving} onChange={event => { setMorningTime(event.target.value) }} /></label>
      <label><span>下班同步</span><input type="time" value={eveningTime} disabled={!ready || !enabled || saving} onChange={event => { setEveningTime(event.target.value) }} /></label>
      <button type="button" className="iepms-personal-schedule-save" disabled={!ready || saving} onClick={() => { void saveSchedule() }}>{saving ? '保存中…' : '保存定时'}</button>
    </div>
    <div className="iepms-personal-reminders">
      <label className="iepms-personal-schedule-toggle"><input type="checkbox" checked={reminders.startupInspection} disabled={!ready || savingReminders} onChange={event => { setReminders(current => ({ ...current, startupInspection: event.target.checked })) }} /><span><strong>启动巡检</strong><small>每天首次启动桌面端时巡检一次</small></span></label>
      <label className="iepms-personal-schedule-toggle"><input type="checkbox" checked={reminders.usePet} disabled={savingReminders} onChange={event => { setReminders(current => ({ ...current, usePet: event.target.checked })) }} /><span><strong>PET 提醒</strong><small>PET 可用时由宠物展示</small></span></label>
      <label className="iepms-personal-schedule-toggle"><input type="checkbox" checked={reminders.fallbackNotification} disabled={savingReminders} onChange={event => { setReminders(current => ({ ...current, fallbackNotification: event.target.checked })) }} /><span><strong>降级提醒</strong><small>PET 不可用时使用桌面或插件提醒</small></span></label>
      <label className="iepms-personal-schedule-toggle"><input type="checkbox" checked={reminders.nightSafety} disabled={savingReminders || reminders.shiftType !== 'night'} onChange={event => { setReminders(current => ({ ...current, nightSafety: event.target.checked })) }} /><span><strong>夜班安全提醒</strong><small>仅夜班班次生效</small></span></label>
      <label className="iepms-personal-shift"><span>个人班次</span><select value={reminders.shiftType} disabled={savingReminders} onChange={event => { setReminders(current => ({ ...current, shiftType: event.target.value as typeof current.shiftType, nightSafety: event.target.value === 'night' ? current.nightSafety : false })) }}><option value="day">日班</option><option value="night">夜班</option><option value="flexible">弹性班</option><option value="off">休息</option></select></label>
      <button type="button" className="iepms-personal-schedule-save" disabled={!ready || savingReminders} onClick={() => { void saveReminders() }}>{savingReminders ? '保存中…' : '保存提醒'}</button>
    </div>
    {!value.accountConfigured && <p className="iepms-personal-automation-hint is-error">请先配置个人考勤账号。</p>}
    {value.accountConfigured && !value.loginReady && <p className="iepms-personal-automation-hint is-error">执行巡检需要登录 iEPMS，请先在管理版配置登录账号和密码。</p>}
    {value.message && <p className={`iepms-personal-automation-hint is-${value.state === 'error' ? 'error' : 'status'}`} role={value.state === 'error' ? 'alert' : 'status'}>插件提醒：{value.message}</p>}
    {value.lastReminder?.status === 'delivered' && value.lastReminder.channel !== 'pet' && <p className="iepms-personal-automation-hint is-warning" role="status">最近提醒已通过{value.lastReminder.channel === 'desktop' ? '桌面通知' : '插件内'}送达：{reminderTypeLabel(value.lastReminder.type)}（{value.lastReminder.deliveredAt.replace('T', ' ')}）</p>}
    {message !== undefined && <p className={`iepms-personal-automation-hint is-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
  </section>
}

function reminderTypeLabel(type: AttendanceReminderType): string {
  return type === 'missing-clock-in' ? '尚未查询到上班打卡'
    : type === 'missing-clock-out' ? '尚未查询到下班打卡'
      : type === 'makeup-window' ? '仍在补卡时限内'
        : type === 'night-safety' ? '夜班安全提醒'
          : '暂时无法确认打卡状态'
}

function PersonalMetric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: 'blue' | 'green' | 'orange' | 'muted' }) {
  return <article className={`iepms-personal-metric is-${tone}`}><div><span>{icon}</span><p>{label}</p></div><strong>{value}</strong><small>{detail}</small></article>
}

function StatRow({ label, value, amount, detail, tone }: { label: string; value: string; amount: number; detail: string; tone: 'blue' | 'green' | 'orange' | 'red' }) {
  const percent = Math.max(0, Math.min(100, Math.round(amount * 100)))
  return <div className={`iepms-stat-row is-${tone}`}><span>{label}</span><strong>{value}</strong><div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: `${percent}%` }} /></div><small>{detail}</small></div>
}

function PersonalSkeleton() {
  return <div className="iepms-personal-content is-loading" aria-label="正在读取个人考勤" aria-busy="true"><div className="iepms-personal-metrics">{[0, 1, 2, 3].map(item => <div className="iepms-personal-skeleton" key={item} />)}</div><div className="iepms-personal-grid"><div className="iepms-personal-skeleton is-large" /><div className="iepms-personal-skeleton is-large" /></div><div className="iepms-personal-skeleton is-table" /></div>
}

function ConfigurationEditor({ authorization, value, onSaved }: { authorization: string; value: ConfigurationView; onSaved: (value: ConfigurationView) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [webhook, setWebhook] = useState('')
  const [clearWebhook, setClearWebhook] = useState(false)
  const [browserChannel, setBrowserChannel] = useState(value.browserChannel)
  const [overnightExempt, setOvernightExempt] = useState(value.overnightExemptAttendance)
  const [overnightHours, setOvernightHours] = useState(value.overnightCheckWorkHours)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string }>()
  useEffect(() => {
    setBrowserChannel(value.browserChannel)
    setOvernightExempt(value.overnightExemptAttendance)
    setOvernightHours(value.overnightCheckWorkHours)
  }, [value])
  const save = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const account = username.trim()
    if (!value.accountConfigured && !account) return setMessage({ kind: 'error', text: '首次配置需要填写 iEPMS 工号。' })
    if (!value.passwordConfigured && !password) return setMessage({ kind: 'error', text: '首次配置需要填写 iEPMS 密码。' })
    const settings: ConfigurationUpdate = {
      browserChannel, overnightExemptAttendance: overnightExempt, overnightCheckWorkHours: overnightHours,
    }
    if (account) settings.username = account
    if (password) settings.password = password
    if (clearWebhook) settings.defaultWebhook = ''
    else if (webhook.trim()) settings.defaultWebhook = webhook.trim()
    setSaving(true)
    setMessage(undefined)
    try {
      const next = await requestManagementApi<ConfigurationView>(authorization, 'configuration', {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(settings),
      })
      if (!isConfiguration(next)) throw new Error('配置服务返回了无效数据。')
      setUsername('')
      setPassword('')
      setWebhook('')
      setClearWebhook(false)
      setMessage({ kind: 'success', text: '配置已安全保存，不会自动触发登录或巡检。' })
      onSaved(next)
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '配置保存失败。' })
    } finally { setSaving(false) }
  }
  return <section className="iepms-attendance-section iepms-attendance-config">
    <header><IconInspectOutline16 size={16} /><h2>本地配置</h2><span>保存后仅更新本地设置</span></header>
    <form onSubmit={event => { void save(event) }}>
      <div className="iepms-attendance-config-grid">
        <label><span>iEPMS 工号</span><input autoComplete="username" value={username} onChange={event => { setUsername(event.target.value) }} placeholder={value.accountConfigured ? `已配置：${value.accountMasked}` : '请输入工号'} /></label>
        <label><span>iEPMS 密码</span><input type="password" autoComplete="new-password" value={password} onChange={event => { setPassword(event.target.value) }} placeholder={value.passwordConfigured ? '已安全保存，留空不修改' : '请输入密码'} /></label>
        <label><span>钉钉 Webhook</span><input type="password" autoComplete="off" value={webhook} disabled={clearWebhook} onChange={event => { setWebhook(event.target.value) }} placeholder={value.webhookConfigured ? '已配置，留空不修改' : '请输入 HTTPS Webhook'} /></label>
        <label><span>浏览器通道</span><select value={browserChannel} onChange={event => { setBrowserChannel(event.target.value as ConfigurationView['browserChannel']) }}><option value="chrome">Chrome</option><option value="msedge">Microsoft Edge</option><option value="chromium">Chromium</option></select></label>
      </div>
      <div className="iepms-attendance-config-options">
        <label><input type="checkbox" checked={overnightExempt} onChange={event => { setOvernightExempt(event.target.checked) }} /><span>夜班免打卡</span></label>
        <label><input type="checkbox" checked={overnightHours} onChange={event => { setOvernightHours(event.target.checked) }} /><span>夜班检查工时</span></label>
        {value.webhookConfigured && <label><input type="checkbox" checked={clearWebhook} onChange={event => { setClearWebhook(event.target.checked) }} /><span>清除现有 Webhook</span></label>}
      </div>
      <div className="iepms-attendance-config-actions">
        <p>账号和密码仅存入插件本地数据库；页面与接口均不回显密码或 Webhook。</p>
        <button type="submit" disabled={saving}>{saving ? '保存中…' : '保存配置'}</button>
      </div>
      {message !== undefined && <p className={`iepms-attendance-config-message is-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    </form>
  </section>
}

function Metric({ label, value, detail, good }: { label: string; value: string; detail: string; good: boolean }) {
  return <article className="iepms-attendance-metric"><p>{label}</p><strong className={good ? 'is-good' : 'is-warning'}>{value}</strong><span>{detail}</span></article>
}

function Readiness({ label, ready, missingLabel = '待配置' }: { label: string; ready: boolean; missingLabel?: string }) { return <li><span>{label}</span><strong className={ready ? 'is-ready' : 'is-missing'}>{ready ? '已就绪' : missingLabel}</strong></li> }
function Empty({ text }: { text: string }) { return <p className="iepms-attendance-empty">{text}</p> }
function PanelState({ title, text, retry }: { title: string; text: string; retry?: () => void }) { return <div className="iepms-attendance-state" role={retry === undefined ? 'status' : 'alert'}><h2>{title}</h2><p>{text}</p>{retry !== undefined && <button type="button" onClick={retry}>重试</button>}</div> }
function RuntimePreparationState({ value }: { value: RuntimePreparationView }) {
  const progress = Math.max(4, Math.min(100, value.progress))
  const text = value.phase === 'installing-dependencies'
    ? '首次打开仅安装轻量基础依赖；启动巡检时才会按需安装浏览器自动化与图像识别组件。'
    : '此过程不会登录 iEPMS，也不会发送通知。'
  return <div className="iepms-attendance-state iepms-runtime-state" role="status" aria-live="polite">
    <div className="iepms-runtime-state-title"><h2>正在准备插件运行环境</h2><strong>{progress}%</strong></div>
    <div className="iepms-runtime-progress" role="progressbar" aria-label="插件运行环境准备进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>
    <p className="iepms-runtime-detail">{value.detail}</p><p>{text}</p>
  </div>
}
function taskStateLabel(value: string): string { return value === 'ready' ? '就绪' : value === 'running' ? '运行中' : value === 'disabled' ? '已停用' : '未知' }
function isSnapshot(value: unknown): value is DashboardSnapshot { return value !== null && typeof value === 'object' && 'status' in value && 'roster' in value && 'schedule' in value && 'recentRuns' in value }
function isManagementRun(value: unknown): value is ManagementRunView { return value !== null && typeof value === 'object' && ['idle', 'running', 'success', 'error'].includes(String((value as { state?: unknown }).state)) && typeof (value as { message?: unknown }).message === 'string' }
function isManagementAnalytics(value: unknown): value is ManagementAnalyticsView {
  if (value === null || typeof value !== 'object') return false
  const item = value as Partial<ManagementAnalyticsView>
  return typeof item.month === 'string' && Array.isArray(item.rows) && Array.isArray(item.trend) && Array.isArray(item.ranking) && Array.isArray(item.gradeDistribution) && item.metrics !== undefined && item.pagination !== undefined
}
function isRuntimePreparation(value: unknown): value is RuntimePreparationView {
  if (value === null || typeof value !== 'object') return false
  const source = value as Record<string, unknown>
  return ['idle', 'checking-python', 'creating-environment', 'checking-dependencies', 'installing-dependencies', 'verifying', 'ready', 'error'].includes(String(source.phase))
    && typeof source.progress === 'number' && typeof source.detail === 'string'
}
function isManagementAnalyticsPerson(value: unknown): value is ManagementAnalyticsPersonView {
  if (value === null || typeof value !== 'object') return false
  const item = value as Partial<ManagementAnalyticsPersonView>
  return typeof item.month === 'string' && item.person !== undefined && Array.isArray(item.records) && Array.isArray(item.anomalies)
}
function isConfiguration(value: unknown): value is ConfigurationView { return value !== null && typeof value === 'object' && 'accountConfigured' in value && 'passwordConfigured' in value && 'browserChannel' in value }
function isPersonalAttendance(value: unknown): value is PersonalAttendanceView {
  if (value === null || typeof value !== 'object' || !('configured' in value) || !('records' in value)) return false
  const record = value as Partial<PersonalAttendanceView>
  return typeof record.configured === 'boolean' && Array.isArray(record.records) && record.records.every(item => item !== null && typeof item === 'object' && typeof item.date === 'string' && typeof item.status === 'string') && record.calendar !== undefined && Array.isArray(record.calendar.workdays) && record.calendar.workdays.every(date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(date))
}
function isPersonalAutomation(value: unknown): value is PersonalAutomationView {
  if (value === null || typeof value !== 'object' || !('state' in value) || !('schedule' in value)) return false
  const record = value as Partial<PersonalAutomationView>
  const reminders = record.reminders as PersonalAutomationView['reminders'] | undefined
  return ['idle', 'running', 'success', 'error'].includes(String(record.state)) && typeof record.accountConfigured === 'boolean' && typeof record.loginReady === 'boolean' && record.schedule !== undefined && typeof record.schedule.enabled === 'boolean' && Array.isArray(record.schedule.times) && reminders !== undefined && typeof reminders.startupInspection === 'boolean' && typeof reminders.usePet === 'boolean' && typeof reminders.fallbackNotification === 'boolean' && typeof reminders.nightSafety === 'boolean' && ['day', 'night', 'flexible', 'off'].includes(reminders.shiftType)
}
function isPersonalMakeup(value: unknown): value is PersonalMakeupView {
  if (value === null || typeof value !== 'object' || !('configured' in value) || !('items' in value)) return false
  const result = value as Partial<PersonalMakeupView>
  return typeof result.configured === 'boolean' && Array.isArray(result.items) && result.items.every(item => item !== null && typeof item === 'object' && typeof item.attendanceDate === 'string' && ['makeup', 'overtime', 'submitted'].includes(String(item.mode)) && typeof item.deadline === 'string' && typeof item.message === 'string' && Array.isArray(item.overtimeReminderDates) && item.overtimeReminderDates.every(date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(date)))
}
function isRosterRow(value: unknown): value is RosterRow {
  if (value === null || typeof value !== 'object') return false
  const row = value as Partial<RosterRow>
  return ['rowId', 'projectName', 'projectCode', 'name', 'city', 'account', 'mobile', 'dingtalkId'].every(key => typeof (row as unknown as Record<string, unknown>)[key] === 'string') && typeof row.webhookConfigured === 'boolean'
}
function isRosterTable(value: unknown): value is RosterTableView {
  if (value === null || typeof value !== 'object' || !('rows' in value)) return false
  const table = value as Partial<RosterTableView>
  return Array.isArray(table.rows) && table.rows.every(isRosterRow) && typeof table.backupAvailable === 'boolean'
}
function isPersonalRoster(value: unknown): value is PersonalRosterView {
  if (value === null || typeof value !== 'object' || !('configured' in value)) return false
  const result = value as Partial<PersonalRosterView>
  return typeof result.configured === 'boolean' && typeof result.duplicateCount === 'number' && (result.row === null || isRosterRow(result.row))
}

function dateKey(value: Date): string { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` }
function makeupReminderForDate(date: string, makeup: PersonalMakeupView): 'makeup' | 'overtime' | undefined {
  let overtimeAvailable = false
  for (const item of makeup.items) {
    const deadlineDate = item.deadline.slice(0, 10)
    if (date > item.attendanceDate && date <= deadlineDate) return 'makeup'
    if (item.overtimeReminderDates.includes(date)) overtimeAvailable = true
  }
  return overtimeAvailable ? 'overtime' : undefined
}
function monthKey(value: Date): string { return dateKey(value).slice(0, 7) }
function parseMonth(value: string): [number, number] {
  const match = /^(\d{4})-(\d{2})$/u.exec(value)
  return match === null ? [new Date().getFullYear(), new Date().getMonth() + 1] : [Number(match[1]), Number(match[2])]
}
function shiftMonth(value: string, amount: number): string {
  const [year, month] = parseMonth(value)
  return monthKey(new Date(year, month - 1 + amount, 1))
}
function calendarCells(value: string): Array<{ date: string; day: number } | undefined> {
  const [year, month] = parseMonth(value)
  const first = new Date(year, month - 1, 1)
  const monthDays = new Date(year, month, 0).getDate()
  const slots = Math.ceil((first.getDay() + monthDays) / 7) * 7
  return Array.from({ length: slots }, (_, index) => {
    const day = index - first.getDay() + 1
    return day >= 1 && day <= monthDays ? { date: dateKey(new Date(year, month - 1, day)), day } : undefined
  })
}
function expectedWorkdays(value: string, currentMonth: string, workdayDates: Set<string>): number {
  if (value > currentMonth) return 0
  const [year, month] = parseMonth(value)
  const finalDay = value === currentMonth ? new Date().getDate() : new Date(year, month, 0).getDate()
  let count = 0
  for (let day = 1; day <= finalDay; day += 1) {
    if (workdayDates.has(dateKey(new Date(year, month - 1, day)))) count += 1
  }
  return count
}
function personalStatusLabel(value: PersonalAttendanceStatus): string {
  return value === 'normal' ? '正常' : value === 'late' ? '迟到' : value === 'early' ? '早退' : value === 'missing' ? '缺卡' : value === 'checked-in' ? '已打卡' : '待完成'
}
function statusTone(value?: PersonalAttendanceStatus): 'blue' | 'green' | 'orange' | 'muted' { return value === 'normal' || value === 'checked-in' ? 'green' : value === 'late' || value === 'early' || value === 'missing' ? 'orange' : 'muted' }
function formatWorkMinutes(value: number | null): string { return value === null ? '-' : `${Math.floor(value / 60)}h${String(value % 60).padStart(2, '0')}m` }
function analyticsPath(path: string, values: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== '') search.set(key, String(value))
  return `${path}?${search.toString()}`
}
function gradeTone(value: string): 'green' | 'blue' | 'orange' | 'red' | 'muted' { return value === '优秀' ? 'green' : value === '良好' ? 'blue' : value === '待关注' ? 'orange' : value === '异常较多' ? 'red' : 'muted' }
function detailStatusLabel(value: { status: PersonalAttendanceStatus; resolution?: 'made-up' | 'pending' | 'expired' } | undefined): string {
  if (value === undefined) return '未同步'
  if (value.status === 'missing' && value.resolution === 'made-up') return '已补卡'
  if (value.status === 'missing' && value.resolution === 'pending') return '待补卡'
  if (value.status === 'missing' && value.resolution === 'expired') return '超时未补'
  return personalStatusLabel(value.status)
}
function downloadAnalyticsCsv(month: string, rows: ManagementAnalyticsRow[]): void {
  const headers = ['姓名', '分组', '地市', '应出勤天数', '实际出勤天数', '正常打卡次数', '缺卡次数', '已补卡次数', '待补卡次数', '超时未补卡次数', '迟到次数', '早退次数', '出勤率', '考勤等级']
  const quote = (value: string | number): string => `"${String(value).replace(/"/gu, '""')}"`
  const body = rows.map(row => [row.name, row.group, row.city, row.expectedDays, row.actualDays, row.normalCount, row.missingCount, row.madeUpCount, row.pendingMakeupCount, row.expiredMissingCount, row.lateCount, row.earlyCount, `${row.attendanceRate}%`, row.grade])
  const lines = [headers, ...body].map(line => line.map(quote).join(','))
  const url = URL.createObjectURL(new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `考勤运营分析-${month}.csv`
  link.click()
  window.setTimeout(() => { URL.revokeObjectURL(url) }, 0)
}

async function requestApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_PREFIX}/${path}`, {
    ...init,
    headers: { accept: 'application/json', [CLIENT_HEADER]: CLIENT_NAME, ...init.headers },
  })
  const payload = await response.json().catch(() => undefined) as { error?: unknown } | T | undefined
  if (!response.ok) throw new Error(payload !== undefined && payload !== null && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : '考勤状态服务暂不可用。')
  if (payload === undefined) throw new Error('考勤状态服务没有返回数据。')
  return payload as T
}

function requestManagementApi<T>(authorization: string, path: string, init: RequestInit = {}): Promise<T> {
  return requestApi<T>(path, { ...init, headers: { [MANAGEMENT_HEADER]: authorization, ...init.headers } })
}

function installStyles(): () => void {
  document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${STYLE_ID}"]`)?.remove()
  const style = document.createElement('style')
  style.dataset.pluginCss = STYLE_ID
  style.textContent = cssText
  document.head.appendChild(style)
  return () => { style.remove() }
}
