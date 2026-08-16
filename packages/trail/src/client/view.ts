/** Friendly trajectory view: turn-grouped storyline over the session snapshot. */
import { createElement, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { toolLabel } from './tool-info'
import {
  argPreview, assistantBlockText, buildRounds, firstUserText, fmtDuration, fmtTokens,
  liveRoundIndex, liveStatus, matchesSearchText, nodeText, parseVisibleTones, roundMeta,
  summaryText, textOfContent, toggleVisibleTone, TRAIL_TONES,
} from './model'
import type {
  TrailAssistantBlockLike, TrailNode, TrailRound, TrailRunningCallLike, TrailSnapshotLike,
  TrailTone, TrailTurnTiming,
} from './model'

/** Props the conversation view slot hands to this component. */
export interface TrailViewProps {
  useSession: <S>(selector: (snapshot: TrailSnapshotLike) => S) => S
  loadOlder?: () => Promise<boolean>
}

interface TrailCategoryConfig {
  tone: TrailTone
  label: string
  icon: string
  searchAliases: readonly string[]
}

interface TrailFilter {
  visibleTones: ReadonlySet<TrailTone>
  query: string
}

interface TrailRenderContext {
  expanded: ReadonlySet<string>
  toggle: (key: string) => void
  filter: TrailFilter
}

interface TrailRowOptions {
  key: string
  tone: TrailTone
  label?: string
  content: ReactNode
  searchText: string
  action?: ReactNode
  detail?: ReactNode
  className?: string
}

interface RoundRenderOptions {
  round: TrailRound
  index: number
  turnTimings: ReadonlyMap<number, TrailTurnTiming> | undefined
  context: TrailRenderContext
  open: boolean
  toggleRound: () => void
  live: boolean
  partial: TrailSnapshotLike['partial']
  runningCalls: readonly TrailRunningCallLike[]
}

const EMPTY_NODES: readonly TrailNode[] = []
const EMPTY_CALLS: readonly TrailRunningCallLike[] = []
const FILTER_STORAGE_KEY = 'dsh-trail.visible-categories.v1'

const TRAIL_CATEGORIES: readonly TrailCategoryConfig[] = [
  { tone: 'user', label: '你（用户）', icon: '💬', searchAliases: ['你', '用户', '提问'] },
  { tone: 'reply', label: 'AI 回复', icon: '🤖', searchAliases: ['AI 回复', '回复', 'assistant'] },
  { tone: 'think', label: 'AI 思考', icon: '🧠', searchAliases: ['AI 思考', '思考', 'reasoning'] },
  { tone: 'tool', label: '工具调用', icon: '🛠️', searchAliases: ['工具调用', '工具', 'tool'] },
  { tone: 'success', label: '成功结果', icon: '✅', searchAliases: ['成功结果', '成功', 'success'] },
  { tone: 'error', label: '错误结果', icon: '✕', searchAliases: ['错误结果', '失败', 'error'] },
  { tone: 'system', label: '系统事件', icon: 'i', searchAliases: ['系统事件', '系统', 'system'] },
  { tone: 'other', label: '其他', icon: '⚙', searchAliases: ['其他', 'other'] },
]

function categoryFor(tone: TrailTone): TrailCategoryConfig {
  return TRAIL_CATEGORIES.find(category => category.tone === tone) ?? TRAIL_CATEGORIES[7]!
}

function allVisibleTones(): Set<TrailTone> {
  return new Set(TRAIL_TONES)
}

function loadVisibleTones(): Set<TrailTone> {
  if (typeof window === 'undefined') return allVisibleTones()
  try {
    return new Set(parseVisibleTones(window.localStorage.getItem(FILTER_STORAGE_KEY)))
  } catch {
    return allVisibleTones()
  }
}

function saveVisibleTones(tones: ReadonlySet<TrailTone>): void {
  try {
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(TRAIL_TONES.filter(tone => tones.has(tone))))
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

function roundDuration(turnTimings: ReadonlyMap<number, TrailTurnTiming> | undefined, turn: number | null): number | null {
  if (turn === null || turnTimings === undefined) return null
  const timing = turnTimings.get(turn)
  if (timing === undefined || typeof timing.startTime !== 'number' || typeof timing.endTime !== 'number') return null
  return timing.endTime - timing.startTime
}

function roundKey(round: TrailRound, index: number): string {
  if (round.turn !== null) return `turn-${round.turn}`
  const firstSeq = round.items[0]?.seq
  return firstSeq === undefined ? `round-${index}` : `seq-${firstSeq}`
}

function renderIcon(tone: TrailTone): ReactNode {
  return createElement('span', {
    className: `tf-icon tf-icon-${tone}`,
    'aria-hidden': 'true',
  }, categoryFor(tone).icon)
}

function rowMatches(options: TrailRowOptions, filter: TrailFilter): boolean {
  if (!filter.visibleTones.has(options.tone)) return false
  const aliases = categoryFor(options.tone).searchAliases.join(' ')
  return matchesSearchText(`${aliases} ${options.searchText}`, filter.query)
}

function renderRow(options: TrailRowOptions, filter: TrailFilter): ReactNode | null {
  if (!rowMatches(options, filter)) return null
  const copy: ReactNode[] = []
  if (options.label !== undefined) {
    copy.push(createElement('span', { key: 'label', className: 'tf-row-label' }, `${options.label}：`))
  }
  copy.push(createElement('span', { key: 'content', className: 'tf-row-text' }, options.content))
  const className = `tf-row tf-row-${options.tone}${options.className === undefined ? '' : ` ${options.className}`}`
  return createElement('div', { key: options.key, className },
    renderIcon(options.tone),
    createElement('div', { className: 'tf-row-main' },
      createElement('div', { className: 'tf-row-copy' }, copy),
      options.detail ?? null),
    options.action === undefined ? null : createElement('div', { className: 'tf-row-action' }, options.action))
}

function renderTextButton(label: string, onClick: () => void, expanded?: boolean): ReactNode {
  return createElement('button', {
    type: 'button',
    className: 'tf-btn tf-row-btn',
    onClick,
    ...(expanded === undefined ? {} : { 'aria-expanded': expanded }),
  }, label)
}

function renderStatus(label: string, tone: 'thinking' | 'running' | 'replying'): ReactNode {
  return createElement('span', { className: `tf-status tf-status-${tone}` },
    label,
    createElement('span', { className: 'tf-spinner', 'aria-hidden': 'true' }))
}

function renderAssistantBlock(block: TrailAssistantBlockLike, key: string, context: TrailRenderContext): ReactNode | null {
  if (block.kind === 'text') {
    const full = block.text ?? ''
    if (full.trim() === '') return null
    const open = context.expanded.has(key)
    const compact = summaryText(full, 180)
    const long = summaryText(full, Number.MAX_SAFE_INTEGER).length > 180
    return renderRow({
      key,
      tone: 'reply',
      label: 'AI 回复',
      content: open ? full : compact,
      searchText: assistantBlockText(block),
      action: long ? renderTextButton(open ? '收起' : '展开', () => { context.toggle(key) }, open) : undefined,
      className: open ? 'tf-row-expanded' : undefined,
    }, context.filter)
  }
  if (block.kind === 'reasoning') {
    const full = block.text ?? ''
    if (full.trim() === '') return null
    const open = context.expanded.has(key)
    return renderRow({
      key,
      tone: 'think',
      label: 'AI 思考',
      content: open ? full : summaryText(full, 60),
      searchText: assistantBlockText(block),
      action: renderTextButton(open ? '收起' : '展开', () => { context.toggle(key) }, open),
      className: open ? 'tf-row-expanded' : undefined,
    }, context.filter)
  }
  if (block.kind === 'tool-call') {
    const label = toolLabel(block.name)
    const preview = argPreview(block.name, block.argsRaw)
    const open = context.expanded.has(key)
    const detail: string[] = []
    if (label[1] !== '') detail.push(`说明：${label[1]}`)
    detail.push(`参数：\n${typeof block.argsRaw === 'string' && block.argsRaw !== '' ? block.argsRaw : '（无参数）'}`)
    return renderRow({
      key,
      tone: 'tool',
      content: `${label[0]}${preview === '' ? '' : `：${preview}`}`,
      searchText: assistantBlockText(block),
      action: renderTextButton(open ? '收起详情' : '详情', () => { context.toggle(key) }, open),
      detail: open ? createElement('pre', { className: 'tf-detail' }, detail.join('\n\n')) : undefined,
    }, context.filter)
  }
  return block.kind === 'image'
    ? renderRow({ key, tone: 'other', content: 'AI 生成了一张图片', searchText: assistantBlockText(block) }, context.filter)
    : renderRow({ key, tone: 'other', content: '系统事件：其他内容', searchText: assistantBlockText(block) }, context.filter)
}

function renderAssistantNode(node: TrailNode, baseKey: string, context: TrailRenderContext): ReactNode | null {
  const rows: ReactNode[] = []
  const blocks = node.blocks ?? []
  for (let index = 0; index < blocks.length; index++) {
    const row = renderAssistantBlock(blocks[index]!, `${baseKey}_b${index}`, context)
    if (row !== null) rows.push(row)
  }
  if (node.interrupted) {
    const row = renderRow({
      key: `${baseKey}_stop`, tone: 'error', content: '已停止', searchText: '错误结果 已停止 interrupted',
    }, context.filter)
    if (row !== null) rows.push(row)
  }
  return rows.length === 0 ? null : createElement('div', { key: baseKey, className: 'tf-node-group' }, rows)
}

function toolResultDetail(node: TrailNode, note: string, argsRaw: string, result: string, duration: string | null): string {
  const detail: string[] = []
  if (note !== '') detail.push(`说明：${note}`)
  detail.push(`参数：\n${argsRaw === '' ? '（无参数）' : argsRaw}`)
  detail.push(`结果：\n${result === '' ? '（无文本结果）' : result}`)
  if (duration !== null) detail.push(`耗时：${duration}`)
  if (node.error !== null && node.error !== undefined) {
    const code = node.error.code !== undefined && node.error.code !== null ? `（${String(node.error.code)}）` : ''
    detail.push(`错误：${String(node.error.name ?? '')}${code}`)
  }
  return detail.join('\n\n')
}

function renderToolResultNode(node: TrailNode, baseKey: string, context: TrailRenderContext): ReactNode | null {
  const name = node.call !== null && typeof node.call === 'object' && typeof node.call.name === 'string'
    ? node.call.name
    : undefined
  const label = toolLabel(name)
  const argsRaw = node.call !== null && typeof node.call === 'object' && typeof node.call.argsRaw === 'string'
    ? node.call.argsRaw
    : ''
  const callPreview = argPreview(name, argsRaw)
  const result = textOfContent(node.content)
  const duration = typeof node.time === 'number' && typeof node.callTime === 'number'
    ? fmtDuration(node.time - node.callTime)
    : null
  const open = context.expanded.has(baseKey)
  const detail = toolResultDetail(node, label[1], argsRaw, result, duration)
  const action = renderTextButton(open ? '收起详情' : '详情', () => { context.toggle(baseKey) }, open)
  if (node.isError === true) {
    const error = node.error !== null && node.error !== undefined
      ? ((node.error.name || node.error.code) ?? '未知错误')
      : '未知错误'
    return renderRow({
      key: baseKey,
      tone: 'error',
      content: `${label[0]}失败：${String(error)}`,
      searchText: nodeText(node),
      action,
      detail: open ? createElement('pre', { className: 'tf-detail' }, detail) : undefined,
    }, context.filter)
  }
  return renderRow({
    key: baseKey,
    tone: 'success',
    content: `${label[0]}成功${callPreview === '' ? '' : `：${callPreview}`}`,
    searchText: nodeText(node),
    action,
    detail: open ? createElement('pre', { className: 'tf-detail' }, detail) : undefined,
  }, context.filter)
}

function renderSystemNode(node: TrailNode, baseKey: string, context: TrailRenderContext): ReactNode | null {
  if (node.kind === 'context') {
    return renderRow({ key: baseKey, tone: 'system', content: '注入了上下文信息', searchText: nodeText(node) }, context.filter)
  }
  if (node.kind === 'compaction') {
    const open = context.expanded.has(baseKey)
    const bits: string[] = []
    if (typeof node.shadowedItemCount === 'number') bits.push(`${node.shadowedItemCount} 条记录`)
    if (typeof node.shadowedTokenCount === 'number') bits.push(`${node.shadowedTokenCount} token`)
    return renderRow({
      key: baseKey,
      tone: 'system',
      content: createElement('span', null,
        '历史压缩，把之前的对话压缩成摘要，节省 token',
        bits.length === 0 ? null : createElement('span', { className: 'tf-inline-meta' }, `（${bits.join('、')}）`)),
      searchText: nodeText(node),
      action: node.summary === null || node.summary === undefined
        ? undefined
        : renderTextButton(open ? '收起摘要' : '摘要', () => { context.toggle(baseKey) }, open),
      detail: open && node.summary !== null && node.summary !== undefined
        ? createElement('pre', { className: 'tf-detail' }, node.summary)
        : undefined,
    }, context.filter)
  }
  if (node.kind === 'turn-error') {
    return renderRow({
      key: baseKey,
      tone: 'error',
      content: `本轮出错：${node.message ?? '未知错误'}${typeof node.code === 'string' && node.code !== '' ? `（${node.code}）` : ''}`,
      searchText: nodeText(node),
    }, context.filter)
  }
  if (node.kind === 'turn-max-tokens') {
    return renderRow({ key: baseKey, tone: 'system', content: '回复达到长度上限，被截断', searchText: nodeText(node) }, context.filter)
  }
  if (node.kind === 'model-retry') {
    return renderRow({ key: baseKey, tone: 'system', content: '模型请求失败，已自动重试', searchText: nodeText(node) }, context.filter)
  }
  return renderRow({
    key: baseKey, tone: 'other', content: `系统事件：其他（${String(node.kind)}）`, searchText: nodeText(node),
  }, context.filter)
}

function renderNode(node: TrailNode, index: number, context: TrailRenderContext): ReactNode | null {
  const baseKey = `n${node.seq}_${index}`
  if (node.kind === 'user' || node.kind === 'steering') {
    const full = textOfContent(node.content)
    const open = context.expanded.has(baseKey)
    const compact = summaryText(full, 120)
    const long = summaryText(full, Number.MAX_SAFE_INTEGER).length > 120
    return renderRow({
      key: baseKey,
      tone: 'user',
      label: node.kind === 'user' ? '你' : '你补充说',
      content: open ? full : compact,
      searchText: nodeText(node),
      action: long ? renderTextButton(open ? '收起' : '展开', () => { context.toggle(baseKey) }, open) : undefined,
      className: open ? 'tf-row-expanded' : undefined,
    }, context.filter)
  }
  if (node.kind === 'assistant') return renderAssistantNode(node, baseKey, context)
  if (node.kind === 'tool-result') return renderToolResultNode(node, baseKey, context)
  return renderSystemNode(node, baseKey, context)
}

function runningStatus(call: TrailRunningCallLike | undefined): string {
  if (call === undefined || typeof call.time !== 'number') return '正在运行'
  return `正在运行 ${Math.max(0, Math.round((Date.now() - call.time) / 1000))}s`
}

function renderLiveRows(
  partial: TrailSnapshotLike['partial'],
  runningCalls: readonly TrailRunningCallLike[],
  filter: TrailFilter,
): ReactNode[] {
  const rows: ReactNode[] = []
  const representedCalls = new Set<number>()
  const blocks = partial?.blocks ?? []
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index]!
    let row: ReactNode | null = null
    if (block.kind === 'text' && (block.text ?? '').trim() !== '') {
      row = renderRow({
        key: `live-text-${index}`,
        tone: 'reply',
        label: 'AI 回复',
        content: summaryText(block.text ?? '', 180),
        searchText: assistantBlockText(block),
        action: renderStatus('生成中…', 'replying'),
      }, filter)
    } else if (block.kind === 'reasoning') {
      row = renderRow({
        key: `live-reason-${index}`,
        tone: 'think',
        label: 'AI 思考',
        content: summaryText(block.text ?? '', 60),
        searchText: assistantBlockText(block),
        action: renderStatus('正在思考', 'thinking'),
      }, filter)
    } else if (block.kind === 'tool-call') {
      const label = toolLabel(block.name)
      const preview = argPreview(block.name, block.argsRaw)
      const callIndex = runningCalls.findIndex((call, runningIndex) => !representedCalls.has(runningIndex) && call.name === block.name)
      if (callIndex >= 0) representedCalls.add(callIndex)
      row = renderRow({
        key: `live-tool-${index}`,
        tone: 'tool',
        content: `${label[0]}${preview === '' ? '' : `：${preview}`}`,
        searchText: assistantBlockText(block),
        action: renderStatus(runningStatus(callIndex < 0 ? undefined : runningCalls[callIndex]), 'running'),
      }, filter)
    }
    if (row !== null) rows.push(row)
  }
  for (let index = 0; index < runningCalls.length; index++) {
    if (representedCalls.has(index)) continue
    const call = runningCalls[index]!
    const label = toolLabel(call.name)
    const row = renderRow({
      key: `live-call-${index}`,
      tone: 'tool',
      content: label[0],
      searchText: `工具调用 tool ${call.name ?? ''} ${label[0]} ${label[1]}`,
      action: renderStatus(runningStatus(call), 'running'),
    }, filter)
    if (row !== null) rows.push(row)
  }
  return rows
}

function renderRound(options: RoundRenderOptions): ReactNode | null {
  const meta = roundMeta(options.round)
  const duration = roundDuration(options.turnTimings, options.round.turn)
  const userText = firstUserText(options.round)
  const metaBits: string[] = []
  if (options.live) metaBits.push('正在运行')
  else if (duration !== null) metaBits.push(fmtDuration(duration))
  if (meta.model !== null) metaBits.push(meta.model)
  if (!options.live && meta.tokens !== null) metaBits.push(`${fmtTokens(meta.tokens)} token`)
  const rows: ReactNode[] = []
  for (let index = 0; index < options.round.items.length; index++) {
    const row = renderNode(options.round.items[index]!, index, options.context)
    if (row !== null) rows.push(row)
  }
  if (options.live) rows.push(...renderLiveRows(options.partial, options.runningCalls, options.context.filter))
  if (rows.length === 0) return null
  const title = options.round.turn === null ? '开始' : `第 ${options.round.turn} 轮`
  return createElement('section', {
    key: roundKey(options.round, options.index),
    className: `tf-round${options.live ? ' tf-live' : ''}`,
  },
  createElement('button', {
    type: 'button',
    className: 'tf-round-head',
    onClick: options.toggleRound,
    'aria-expanded': options.open,
  },
  createElement('span', { className: 'tf-round-summary' },
    createElement('span', { className: 'tf-turn-title' }, title),
    userText === null ? null : createElement('span', { className: 'tf-turn-question' }, ` · 你问：${summaryText(userText, 40)}`)),
  metaBits.length === 0 ? null : createElement('span', { className: 'tf-round-meta' }, metaBits.join(' · ')),
  createElement('span', { className: `tf-chevron${options.open ? ' tf-chevron-open' : ''}`, 'aria-hidden': 'true' })),
  options.open ? createElement('div', { className: 'tf-round-body' }, rows) : null)
}

function renderStandaloneLive(
  partial: TrailSnapshotLike['partial'],
  runningCalls: readonly TrailRunningCallLike[],
  status: ReturnType<typeof liveStatus>,
  filter: TrailFilter,
): ReactNode | null {
  const rows = renderLiveRows(partial, runningCalls, filter)
  if (rows.length === 0) return null
  return createElement('section', { key: 'live', className: 'tf-round tf-live' },
    createElement('div', { className: 'tf-round-head tf-round-head-static' },
      createElement('span', { className: 'tf-round-summary' },
        createElement('span', { className: 'tf-turn-title' }, '正在进行的回合')),
      createElement('span', { className: 'tf-round-meta' }, '正在运行'),
      status === null ? null : renderStatus(status[0] + (status[1] === '' ? '' : `：${status[1]}`), 'running')),
    createElement('div', { className: 'tf-round-body' }, rows))
}

/** Session-scoped storyline view registered under the trajectory tab. */
export function TrajectoryView(props: TrailViewProps): ReactNode {
  const { useSession } = props
  const nodes = useSession(snapshot => snapshot.nodes ?? EMPTY_NODES)
  const turnTimings = useSession(snapshot => snapshot.turnTimings)
  const partial = useSession(snapshot => snapshot.partial)
  const runningCalls = useSession(snapshot => snapshot.runningCalls ?? EMPTY_CALLS)
  const hasMore = useSession(snapshot => snapshot.hasMore)
  const loadingOlder = useSession(snapshot => snapshot.loadingOlder)
  const openState = useSession(snapshot => snapshot.openState)

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [roundOverrides, setRoundOverrides] = useState<Map<string, boolean>>(() => new Map())
  const [legendOpen, setLegendOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [visibleTones, setVisibleTones] = useState<Set<TrailTone>>(loadVisibleTones)
  const [paging, setPaging] = useState(false)

  useEffect(() => { saveVisibleTones(visibleTones) }, [visibleTones])

  const toggle = (key: string): void => {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const resetRoundOverrides = (): void => { setRoundOverrides(new Map()) }
  const selectAllTones = (): void => {
    setVisibleTones(allVisibleTones())
    resetRoundOverrides()
  }
  const toggleTone = (tone: TrailTone): void => {
    setVisibleTones(previous => new Set(toggleVisibleTone(previous, tone)))
    resetRoundOverrides()
  }

  const rounds = buildRounds(nodes)
  const live = partial !== null || runningCalls.length > 0
  const liveIndex = liveRoundIndex(rounds.length, live)
  const status = liveStatus(partial, runningCalls)
  const narrowed = query.trim() !== '' || visibleTones.size !== TRAIL_TONES.length
  const context: TrailRenderContext = { expanded, toggle, filter: { visibleTones, query } }

  const loadEarlier = (): void => {
    setPaging(true)
    const result = props.loadOlder === undefined ? Promise.resolve(false) : props.loadOlder()
    void result.then(() => { setPaging(false) }, () => { setPaging(false) })
  }

  const children: ReactNode[] = [
    createElement('h2', { key: 'title', className: 'tf-title' }, '轨迹'),
    createElement('div', { key: 'top', className: 'tf-top' },
      createElement('label', { className: 'tf-search-field' },
        createElement('span', { className: 'tf-search-icon', 'aria-hidden': 'true' }),
        createElement('input', {
          type: 'search',
          className: 'tf-search',
          placeholder: '搜索轨迹…',
          value: query,
          onChange: (event) => {
            setQuery(event.target.value)
            resetRoundOverrides()
          },
          'aria-label': '搜索轨迹',
        })),
      createElement('button', {
        type: 'button',
        className: 'tf-btn tf-legend-toggle',
        onClick: () => { setLegendOpen(!legendOpen) },
        'aria-expanded': legendOpen,
      },
      legendOpen ? '隐藏筛选' : '显示筛选',
      createElement('span', {
        className: `tf-button-chevron${legendOpen ? ' tf-button-chevron-open' : ''}`,
        'aria-hidden': 'true',
      }))),
  ]
  if (legendOpen) {
    const allSelected = visibleTones.size === TRAIL_TONES.length
    children.push(createElement('div', {
      key: 'legend', className: 'tf-legend', role: 'toolbar', 'aria-label': '筛选轨迹类别',
    },
    createElement('button', {
      type: 'button',
      className: `tf-filter${allSelected ? ' tf-filter-active' : ''}`,
      onClick: selectAllTones,
      'aria-pressed': allSelected,
    }, '全部'),
    TRAIL_CATEGORIES.map(category => createElement('button', {
      key: category.tone,
      type: 'button',
      className: `tf-filter${visibleTones.has(category.tone) ? ' tf-filter-active' : ''}`,
      onClick: () => { toggleTone(category.tone) },
      'aria-pressed': visibleTones.has(category.tone),
    }, renderIcon(category.tone), createElement('span', null, category.label)))))
  }

  const content: ReactNode[] = []
  if (openState === 'loading') {
    content.push(createElement('div', { key: 'loading', className: 'tf-loading' }, '正在加载记录…'))
  } else if (openState === 'error') {
    content.push(createElement('div', { key: 'error', className: 'tf-loading tf-loading-error' }, '记录加载失败'))
  } else if (rounds.length === 0 && !live) {
    content.push(createElement('div', { key: 'empty', className: 'tf-empty' },
      createElement('div', { className: 'tf-empty-icon', 'aria-hidden': 'true' }, '▱'),
      createElement('div', { className: 'tf-empty-title' }, '还没有轨迹。'),
      createElement('div', { className: 'tf-empty-copy' }, '给 AI 发一条消息，这里会记录完整的互动过程。')))
  } else {
    let visibleRoundCount = 0
    for (let index = 0; index < rounds.length; index++) {
      const round = rounds[index]!
      const key = roundKey(round, index)
      const isLive = index === liveIndex
      const defaultOpen = narrowed || index < 2 || isLive
      const open = roundOverrides.get(key) ?? defaultOpen
      const rendered = renderRound({
        round,
        index,
        turnTimings,
        context,
        open,
        toggleRound: () => {
          setRoundOverrides((previous) => {
            const next = new Map(previous)
            next.set(key, !(next.get(key) ?? defaultOpen))
            return next
          })
        },
        live: isLive,
        partial,
        runningCalls,
      })
      if (rendered !== null) {
        content.push(rendered)
        visibleRoundCount++
      }
    }
    if (rounds.length === 0 && live) {
      const rendered = renderStandaloneLive(partial, runningCalls, status, context.filter)
      if (rendered !== null) {
        content.push(rendered)
        visibleRoundCount++
      }
    }
    if (visibleRoundCount === 0) {
      content.push(createElement('div', { key: 'nomatch', className: 'tf-loading' },
        query.trim() === '' ? '所选类别暂无轨迹' : '没有找到相关内容'))
    }
    if (hasMore) {
      content.push(createElement('button', {
        key: 'more',
        type: 'button',
        className: 'tf-btn tf-more-btn',
        disabled: loadingOlder === true || paging,
        onClick: loadEarlier,
      },
      createElement('span', { 'aria-hidden': 'true' }, '↓'),
      loadingOlder === true || paging ? '加载中…' : '加载更早记录'))
    }
  }
  children.push(createElement('div', { key: 'content', className: 'tf-content' }, content))

  return createElement('div', { className: 'tf-root' }, children)
}
