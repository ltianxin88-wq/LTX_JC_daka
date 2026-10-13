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
  type ConfigurationUpdate, type ConfigurationView, type DashboardSnapshot,
  type PersonalAttendanceRecord, type PersonalAttendanceStatus, type PersonalAttendanceView,
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
  const [view, setView] = useState<'management' | 'personal'>('management')
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>()
  const [configuration, setConfiguration] = useState<ConfigurationView>()
  const [error, setError] = useState('')
  const [personalState, setPersonalState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [personal, setPersonal] = useState<PersonalAttendanceView>()
  const [personalError, setPersonalError] = useState('')
  const load = useCallback(async (background = false): Promise<void> => {
    if (!background) setState('loading')
    setError('')
    try {
      const [nextSnapshot, nextConfiguration] = await Promise.all([
        requestApi<DashboardSnapshot>('snapshot'), requestApi<ConfigurationView>('configuration'),
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
  useEffect(() => { void load() }, [load])
  const loadPersonal = useCallback(async (): Promise<void> => {
    setPersonalState('loading')
    setPersonalError('')
    try {
      const next = await requestApi<PersonalAttendanceView>('personal-attendance')
      if (!isPersonalAttendance(next)) throw new Error('个人考勤服务返回了无效数据。')
      setPersonal(next)
      setPersonalState('ready')
    } catch (value) {
      setPersonalState('error')
      setPersonalError(value instanceof Error ? value.message : '个人考勤读取失败。')
    }
  }, [])
  useEffect(() => { if (view === 'personal' && personalState === 'idle') void loadPersonal() }, [loadPersonal, personalState, view])
  return <section className="iepms-attendance-workspace" aria-labelledby="iepms-attendance-title">
    <header className="iepms-attendance-header">
      <div>
        {workspace !== undefined && <button type="button" className="iepms-attendance-back" onClick={workspace.close} aria-label="返回对话" title="返回对话"><IconChevronLeftOutline16 size={16} /></button>}
        <IconAlarmClockOutline16 size={20} />
        <span><h1 id="iepms-attendance-title">考勤监控</h1><p>{view === 'management' ? '管理版 · 本地运行状态与配置' : '个人版 · 我的出勤记录'}</p></span>
      </div>
      <div className="iepms-attendance-header-actions">
        <div className="iepms-attendance-view-switch" role="tablist" aria-label="考勤视图">
          <button type="button" role="tab" aria-selected={view === 'management'} className={view === 'management' ? 'is-active' : ''} onClick={() => { setView('management') }}>管理版</button>
          <button type="button" role="tab" aria-selected={view === 'personal'} className={view === 'personal' ? 'is-active' : ''} onClick={() => { setView('personal') }}>个人版</button>
        </div>
        <button type="button" className="iepms-attendance-refresh" onClick={() => { void (view === 'management' ? load() : loadPersonal()) }} disabled={view === 'management' ? state === 'loading' : personalState === 'loading'} title="刷新状态"><IconInspectOutline16 size={16} /></button>
      </div>
    </header>
    {view === 'management' && state === 'loading' && <PanelState title="正在读取本地状态" text="不会登录 iEPMS，也不会发送通知。" />}
    {view === 'management' && state === 'error' && <PanelState title="暂时无法读取考勤状态" text={error} retry={() => { void load() }} />}
    {view === 'management' && state === 'ready' && snapshot !== undefined && configuration !== undefined && <Dashboard
      snapshot={snapshot}
      configuration={configuration}
      onConfigurationSaved={next => { setConfiguration(next); void load(true) }}
    />}
    {view === 'personal' && (personalState === 'idle' || personalState === 'loading') && <PersonalSkeleton />}
    {view === 'personal' && personalState === 'error' && <PanelState title="暂时无法读取个人考勤" text={personalError} retry={() => { void loadPersonal() }} />}
    {view === 'personal' && personalState === 'ready' && personal !== undefined && <PersonalDashboard value={personal} openSettings={() => { setView('management') }} />}
  </section>
}

function Dashboard({ snapshot, configuration, onConfigurationSaved }: { snapshot: DashboardSnapshot; configuration: ConfigurationView; onConfigurationSaved: (value: ConfigurationView) => void }) {
  const statusConfig = snapshot.status.configuration
  const data = snapshot.status.data
  return <div className="iepms-attendance-content">
    <div className="iepms-attendance-mode" role="status"><IconDataOutline16 size={15} /><span>安全模式</span><p>仅在你点击保存时更新本地配置；不会自动登录、巡检、导出或发送钉钉消息。</p></div>
    <section className="iepms-attendance-summary" aria-label="运行概览">
      <Metric label="后端状态" value={snapshot.status.application.backendRootAvailable ? '可用' : '不可用'} detail={`${snapshot.status.application.name} ${snapshot.status.application.version}`} good={snapshot.status.application.backendRootAvailable} />
      <Metric label="花名册" value={data.rosterAvailable ? `${snapshot.roster.personCount} 人` : '未找到'} detail={data.rosterAvailable ? `${snapshot.roster.projectCount} 个项目` : '请检查本地 roster.xlsx'} good={data.rosterAvailable} />
      <Metric label="计划任务" value={`${snapshot.schedule.tasks.length} 项`} detail={snapshot.schedule.message ?? '已读取本地 Windows 计划任务'} good={snapshot.schedule.supported} />
      <Metric label="配置状态" value={statusConfig.valid ? '已读取' : '需检查'} detail={`${statusConfig.accountConfigured ? '账号已配置' : '账号未配置'} · ${statusConfig.browserConfigured ? '浏览器已配置' : '浏览器未配置'}`} good={statusConfig.valid && statusConfig.accountConfigured} />
    </section>
    <div className="iepms-attendance-columns">
      <section className="iepms-attendance-section"><header><IconClockOutline16 size={16} /><h2>近期状态</h2></header>
        {snapshot.recentRuns.length === 0 ? <Empty text="尚无可展示的本地运行摘要。" /> : <ol className="iepms-attendance-events">{snapshot.recentRuns.map((item, index) => <li key={`${item.timestamp}-${index}`} className={`is-${item.level}`}><time>{item.timestamp}</time><span>{item.summary}</span></li>)}</ol>}
      </section>
      <section className="iepms-attendance-section"><header><IconAlarmClockOutline16 size={16} /><h2>计划任务</h2></header>
        {snapshot.schedule.tasks.length === 0 ? <Empty text={snapshot.schedule.message ?? '没有已管理的计划任务。'} /> : <ul className="iepms-attendance-tasks">{snapshot.schedule.tasks.map(task => <li key={task.name}><span>{task.name}</span><strong className={`is-${task.state}`}>{taskStateLabel(task.state)}</strong></li>)}</ul>}
      </section>
    </div>
    <ConfigurationEditor value={configuration} onSaved={onConfigurationSaved} />
    <section className="iepms-attendance-section iepms-attendance-readiness"><header><IconInspectOutline16 size={16} /><h2>本地准备状态</h2></header><ul>
      <Readiness label="配置文件" ready={statusConfig.fileAvailable && statusConfig.valid} />
      <Readiness label="本地账号配置" ready={statusConfig.accountConfigured} />
      <Readiness label="通知配置" ready={statusConfig.webhookConfigured} />
      <Readiness label="运行日志" ready={data.logAvailable} missingLabel="暂无数据" />
      <Readiness label="最近导出数据" ready={data.lastDataAvailable} missingLabel="暂无数据" />
    </ul></section>
  </div>
}

function PersonalDashboard({ value, openSettings }: { value: PersonalAttendanceView; openSettings: () => void }) {
  const today = new Date()
  const currentMonth = monthKey(today)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const records = value.records.filter(record => record.date.startsWith(`${selectedMonth}-`))
  const recordByDate = new Map(records.map(record => [record.date, record]))
  const todayRecord = value.records.find(record => record.date === dateKey(today))
  const attendanceDays = records.filter(record => record.status !== 'missing' && record.status !== 'pending').length
  const normalPunches = records.filter(record => record.status === 'normal' || record.status === 'checked-in').reduce((total, record) => total + Number(Boolean(record.clockIn)) + Number(Boolean(record.clockOut)), 0)
  const late = records.filter(record => record.status === 'late').length
  const early = records.filter(record => record.status === 'early').length
  const missing = records.filter(record => record.status === 'missing').length
  const expectedDays = expectedWorkdays(selectedMonth, currentMonth)
  const attendanceRate = expectedDays === 0 ? 0 : Math.min(100, Math.round(attendanceDays / expectedDays * 100))
  const anomalyCount = late + early + missing
  const recent = [...value.records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  if (!value.configured) return <div className="iepms-personal-empty"><IconUserOutline16 size={24} /><h2>先配置个人工号</h2><p>个人版只展示当前配置工号对应的本地考勤记录，不会显示其他员工明细。</p><button type="button" onClick={openSettings}>前往管理版配置</button></div>
  return <div className="iepms-personal-content">
    {!value.source.latestAvailable && <div className="iepms-personal-notice"><IconDataOutline16 size={15} /><span>暂无个人考勤数据。完成一次巡检后，个人版会从本地结果中整理记录。</span></div>}
    <section className="iepms-personal-metrics" aria-label="个人考勤概览">
      <PersonalMetric icon={<IconAlarmClockOutline16 size={17} />} label="今日状态" value={todayRecord === undefined ? '暂无记录' : personalStatusLabel(todayRecord.status)} detail={todayRecord === undefined ? '等待本地巡检数据' : `上班 ${todayRecord.clockIn || '-'} / 下班 ${todayRecord.clockOut || '-'}`} tone={statusTone(todayRecord?.status)} />
      <PersonalMetric icon={<IconGaugeOutline16 size={17} />} label="本月出勤" value={`${attendanceDays}天`} detail={`工作日估算 ${expectedDays} 天`} tone="blue" />
      <PersonalMetric icon={<IconCheckCircleOutline16 size={17} />} label="正常打卡" value={`${normalPunches}次`} detail={`出勤率 ${attendanceRate}%`} tone="green" />
      <PersonalMetric icon={<IconWarningTriangleOutline16 size={17} />} label="异常记录" value={`${anomalyCount}次`} detail={`迟到 ${late} 次 · 早退 ${early} 次 · 缺卡 ${missing} 次`} tone={anomalyCount > 0 ? 'orange' : 'muted'} />
    </section>
    <div className="iepms-personal-grid">
      <section className="iepms-personal-card iepms-personal-calendar"><header><span><IconAlarmClockOutline16 size={16} /><h2>月度打卡日历</h2></span><div><button type="button" aria-label="上个月" onClick={() => { setSelectedMonth(shiftMonth(selectedMonth, -1)) }}><IconChevronLeftOutline16 size={15} /></button><strong>{selectedMonth.replace('-', '年')}月</strong><button type="button" aria-label="下个月" disabled={selectedMonth >= currentMonth} onClick={() => { setSelectedMonth(shiftMonth(selectedMonth, 1)) }}><IconChevronRightOutline16 size={15} /></button></div></header>
        <div className="iepms-calendar-weekdays" aria-hidden="true">{['日', '一', '二', '三', '四', '五', '六'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="iepms-calendar-days">{calendarCells(selectedMonth).map(cell => {
          const record = recordByDate.get(cell.date)
          const isToday = cell.date === dateKey(today)
          return <div key={cell.date} className={`iepms-calendar-day${cell.inMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}`} title={record === undefined ? cell.date : `${cell.date} ${personalStatusLabel(record.status)}`}><span>{cell.day}</span>{record !== undefined && <i className={`is-${record.status}`} aria-label={personalStatusLabel(record.status)} />}</div>
        })}</div>
        <div className="iepms-calendar-legend"><span><i className="is-normal" />正常</span><span><i className="is-late" />迟到/早退</span><span><i className="is-missing" />缺卡</span><span><i className="is-pending" />进行中</span></div>
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
    <section className="iepms-personal-card iepms-personal-records"><header><IconChecklistOutline16 size={16} /><h2>最近打卡记录</h2><span>账号 {value.accountMasked}</span></header>
      {recent.length === 0 ? <Empty text="暂无本地个人记录。巡检生成当日明细后会显示在这里。" /> : <div className="iepms-personal-table-wrap"><table><thead><tr><th>日期</th><th>上班时间</th><th>下班时间</th><th>工时</th><th>状态</th></tr></thead><tbody>{recent.map(record => <tr key={record.date}><td>{record.date.slice(5)}</td><td>{record.clockIn || '-'}</td><td>{record.clockOut || '-'}</td><td>{formatWorkMinutes(record.workMinutes)}</td><td><strong className={`is-${record.status}`}>{personalStatusLabel(record.status)}</strong></td></tr>)}</tbody></table></div>}
    </section>
  </div>
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

function ConfigurationEditor({ value, onSaved }: { value: ConfigurationView; onSaved: (value: ConfigurationView) => void }) {
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
      const next = await requestApi<ConfigurationView>('configuration', {
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
        <p>密码存入 Windows 安全凭据；页面与接口均不回显密码或 Webhook。</p>
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
function taskStateLabel(value: string): string { return value === 'ready' ? '就绪' : value === 'running' ? '运行中' : value === 'disabled' ? '已停用' : '未知' }
function isSnapshot(value: unknown): value is DashboardSnapshot { return value !== null && typeof value === 'object' && 'status' in value && 'roster' in value && 'schedule' in value && 'recentRuns' in value }
function isConfiguration(value: unknown): value is ConfigurationView { return value !== null && typeof value === 'object' && 'accountConfigured' in value && 'passwordConfigured' in value && 'browserChannel' in value }
function isPersonalAttendance(value: unknown): value is PersonalAttendanceView {
  if (value === null || typeof value !== 'object' || !('configured' in value) || !('records' in value)) return false
  const record = value as Partial<PersonalAttendanceView>
  return typeof record.configured === 'boolean' && Array.isArray(record.records) && record.records.every(item => item !== null && typeof item === 'object' && typeof item.date === 'string' && typeof item.status === 'string')
}

function dateKey(value: Date): string { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` }
function monthKey(value: Date): string { return dateKey(value).slice(0, 7) }
function parseMonth(value: string): [number, number] {
  const match = /^(\d{4})-(\d{2})$/u.exec(value)
  return match === null ? [new Date().getFullYear(), new Date().getMonth() + 1] : [Number(match[1]), Number(match[2])]
}
function shiftMonth(value: string, amount: number): string {
  const [year, month] = parseMonth(value)
  return monthKey(new Date(year, month - 1 + amount, 1))
}
function calendarCells(value: string): Array<{ date: string; day: number; inMonth: boolean }> {
  const [year, month] = parseMonth(value)
  const first = new Date(year, month - 1, 1)
  const start = new Date(year, month - 1, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return { date: dateKey(date), day: date.getDate(), inMonth: date.getMonth() === month - 1 }
  })
}
function expectedWorkdays(value: string, currentMonth: string): number {
  if (value > currentMonth) return 0
  const [year, month] = parseMonth(value)
  const finalDay = value === currentMonth ? new Date().getDate() : new Date(year, month, 0).getDate()
  let count = 0
  for (let day = 1; day <= finalDay; day += 1) {
    const weekday = new Date(year, month - 1, day).getDay()
    if (weekday !== 0 && weekday !== 6) count += 1
  }
  return count
}
function personalStatusLabel(value: PersonalAttendanceStatus): string {
  return value === 'normal' ? '正常' : value === 'late' ? '迟到' : value === 'early' ? '早退' : value === 'missing' ? '缺卡' : value === 'checked-in' ? '已打卡' : '待完成'
}
function statusTone(value?: PersonalAttendanceStatus): 'blue' | 'green' | 'orange' | 'muted' { return value === 'normal' || value === 'checked-in' ? 'green' : value === 'late' || value === 'early' || value === 'missing' ? 'orange' : 'muted' }
function formatWorkMinutes(value: number | null): string { return value === null ? '-' : `${Math.floor(value / 60)}h${String(value % 60).padStart(2, '0')}m` }

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

function installStyles(): () => void {
  document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${STYLE_ID}"]`)?.remove()
  const style = document.createElement('style')
  style.dataset.pluginCss = STYLE_ID
  style.textContent = cssText
  document.head.appendChild(style)
  return () => { style.remove() }
}
