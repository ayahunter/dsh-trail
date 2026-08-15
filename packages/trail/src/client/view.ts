/** Friendly trajectory view: turn-grouped storyline over the session snapshot. */
import { createElement, useState } from 'react'
import type { ReactNode } from 'react'
import { toolLabel } from './tool-info'
import {
  argPreview, buildRounds, firstLine, firstUserText, fmtDuration, fmtTokens, liveRoundIndex,
  liveStatus, roundMeta, roundText, textOfContent, truncate,
} from './model'
import type {
  TrailAssistantBlockLike, TrailNode, TrailRound, TrailRunningCallLike, TrailSnapshotLike,
  TrailTurnTiming,
} from './model'

/** Props the conversation view slot hands to this component. */
export interface TrailViewProps {
  useSession: <S>(selector: (snapshot: TrailSnapshotLike) => S) => S
  loadOlder?: () => Promise<boolean>
}

type TrailTone = 'user' | 'reply' | 'think' | 'tool' | 'success' | 'error' | 'system' | 'other'

interface TrailRowOptions {
  key: string
  tone: TrailTone
  label?: string
  content: ReactNode
  action?: ReactNode
  detail?: ReactNode
  className?: string
}

interface RoundRenderOptions {
  round: TrailRound
  index: number
  turnTimings: ReadonlyMap<number, TrailTurnTiming> | undefined
  expanded: ReadonlySet<string>
  toggle: (key: string) => void
  open: boolean
  toggleRound: () => void
  live: boolean
  partial: TrailSnapshotLike['partial']
  runningCalls: readonly TrailRunningCallLike[]
}

const EMPTY_NODES: readonly TrailNode[] = []
const EMPTY_CALLS: readonly TrailRunningCallLike[] = []

const ICONS: Readonly<Record<TrailTone, string>> = {
  user: '💬',
  reply: '🤖',
  think: '🧠',
  tool: '🔧',
  success: '✓',
  error: '✕',
  system: 'i',
  other: '⚙',
}

const LEGEND_ITEMS: readonly { tone: TrailTone; label: string }[] = [
  { tone: 'user', label: '你（用户）' },
  { tone: 'reply', label: 'AI 回复' },
  { tone: 'think', label: 'AI 思考' },
  { tone: 'tool', label: '工具调用' },
  { tone: 'success', label: '成功结果' },
  { tone: 'error', label: '错误结果' },
  { tone: 'system', label: '系统事件' },
  { tone: 'other', label: '其他' },
]

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
  }, ICONS[tone])
}

function renderRow(options: TrailRowOptions): ReactNode {
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

function renderAssistantBlock(
  block: TrailAssistantBlockLike,
  key: string,
  expanded: ReadonlySet<string>,
  toggle: (key: string) => void,
): ReactNode | null {
  if (block.kind === 'text') {
    const full = block.text ?? ''
    if (full.trim() === '') return null
    const open = expanded.has(key)
    const long = full.length > 300
    return renderRow({
      key,
      tone: 'reply',
      label: 'AI 回复',
      content: open || !long ? full : truncate(full, 300),
      action: long ? renderTextButton(open ? '收起' : '展开', () => { toggle(key) }, open) : undefined,
    })
  }
  if (block.kind === 'reasoning') {
    const full = block.text ?? ''
    if (full.trim() === '') return null
    const open = expanded.has(key)
    return renderRow({
      key,
      tone: 'think',
      label: 'AI 思考',
      content: open ? full : truncate(full, 60),
      action: renderTextButton(open ? '收起' : '展开', () => { toggle(key) }, open),
    })
  }
  if (block.kind === 'tool-call') {
    const label = toolLabel(block.name)
    const preview = argPreview(block.name, block.argsRaw)
    const open = expanded.has(key)
    return renderRow({
      key,
      tone: 'tool',
      content: createElement('span', null,
        createElement('strong', null, `${label[0]}${preview === '' ? '' : ` ${preview}`}`),
        label[1] === '' ? null : `：${label[1]}`),
      action: renderTextButton(open ? '收起详情' : '详情', () => { toggle(key) }, open),
      detail: open
        ? createElement('pre', { className: 'tf-detail' }, typeof block.argsRaw === 'string' && block.argsRaw !== '' ? block.argsRaw : '（无参数）')
        : undefined,
    })
  }
  return block.kind === 'image'
    ? renderRow({ key, tone: 'other', content: 'AI 生成了一张图片' })
    : renderRow({ key, tone: 'other', content: '系统事件：其他内容' })
}

function renderAssistantNode(
  node: TrailNode,
  baseKey: string,
  expanded: ReadonlySet<string>,
  toggle: (key: string) => void,
): ReactNode {
  const rows: ReactNode[] = []
  const blocks = node.blocks ?? []
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b]
    const bKey = `${baseKey}_b${b}`
    const row = renderAssistantBlock(block, bKey, expanded, toggle)
    if (row !== null) rows.push(row)
  }
  if (node.interrupted) {
    rows.push(renderRow({ key: `${baseKey}_stop`, tone: 'error', content: '已停止' }))
  }
  return createElement('div', { key: baseKey, className: 'tf-node-group' }, rows)
}

function renderToolResultNode(
  node: TrailNode,
  baseKey: string,
  expanded: ReadonlySet<string>,
  toggle: (key: string) => void,
): ReactNode {
  const name = node.call !== null && typeof node.call === 'object' && typeof node.call.name === 'string'
    ? node.call.name
    : undefined
  const label = toolLabel(name)
  const open = expanded.has(baseKey)
  const preview = textOfContent(node.content)
  const headline = firstLine(preview)
  const callPreview = node.call !== null && typeof node.call === 'object' && typeof node.call.argsRaw === 'string'
    ? argPreview(name, node.call.argsRaw)
    : ''
  const duration = typeof node.time === 'number' && typeof node.callTime === 'number'
    ? fmtDuration(node.time - node.callTime)
    : null
  const detail: string[] = [preview === '' ? '（无文本结果）' : preview]
  if (duration !== null) detail.push(`耗时：${duration}`)
  if (node.error !== null && node.error !== undefined) {
    detail.push(`错误：${String(node.error.name ?? '')}${node.error.code !== undefined && node.error.code !== null ? `（${String(node.error.code)}）` : ''}`)
  }
  if (node.isError === true) {
    const errName = node.error !== null && node.error !== undefined
      ? ((node.error.name || node.error.code) ?? '未知错误')
      : '未知错误'
    return renderRow({
      key: baseKey,
      tone: 'error',
      content: createElement('strong', null, `${label[0]} 出错：${String(errName)}`),
      action: renderTextButton(open ? '收起详情' : '详情', () => { toggle(baseKey) }, open),
      detail: open ? createElement('pre', { className: 'tf-detail' }, detail.join('\n')) : undefined,
    })
  }
  return renderRow({
    key: baseKey,
    tone: 'success',
    content: createElement('span', null,
      createElement('strong', null, `${label[0]} 完成${callPreview === '' ? '' : `：${callPreview}`}`),
      headline === null ? null : createElement('span', { className: 'tf-inline-meta' }, ` · 预览第一行：${headline}`),
      duration === null ? null : createElement('span', { className: 'tf-inline-meta' }, ` · 耗时 ${duration}`)),
    action: renderTextButton(open ? '收起详情' : '详情', () => { toggle(baseKey) }, open),
    detail: open ? createElement('pre', { className: 'tf-detail' }, detail.join('\n')) : undefined,
  })
}

function renderSystemNode(
  node: TrailNode,
  baseKey: string,
  expanded: ReadonlySet<string>,
  toggle: (key: string) => void,
): ReactNode {
  if (node.kind === 'context') return renderRow({ key: baseKey, tone: 'system', content: '注入了上下文信息' })
  if (node.kind === 'compaction') {
    const open = expanded.has(baseKey)
    const bits: string[] = []
    if (typeof node.shadowedItemCount === 'number') bits.push(`${node.shadowedItemCount} 条记录`)
    if (typeof node.shadowedTokenCount === 'number') bits.push(`${node.shadowedTokenCount} token`)
    return renderRow({
      key: baseKey,
      tone: 'system',
      content: createElement('span', null,
        '历史压缩，把之前的对话压缩成摘要，节省 token',
        bits.length === 0 ? null : createElement('span', { className: 'tf-inline-meta' }, `（${bits.join('、')}）`)),
      action: node.summary === null || node.summary === undefined
        ? undefined
        : renderTextButton(open ? '收起摘要' : '摘要', () => { toggle(baseKey) }, open),
      detail: open && node.summary !== null && node.summary !== undefined
        ? createElement('pre', { className: 'tf-detail' }, node.summary)
        : undefined,
    })
  }
  if (node.kind === 'turn-error') {
    return renderRow({
      key: baseKey,
      tone: 'error',
      content: createElement('strong', null,
        `本轮出错：${node.message ?? '未知错误'}${typeof node.code === 'string' && node.code !== '' ? `（${node.code}）` : ''}`),
    })
  }
  if (node.kind === 'turn-max-tokens') return renderRow({ key: baseKey, tone: 'system', content: '回复达到长度上限，被截断' })
  if (node.kind === 'model-retry') return renderRow({ key: baseKey, tone: 'system', content: '模型请求失败，已自动重试' })
  return renderRow({ key: baseKey, tone: 'other', content: `系统事件：其他（${String(node.kind)}）` })
}

function renderNode(node: TrailNode, index: number, expanded: ReadonlySet<string>, toggle: (key: string) => void): ReactNode {
  const baseKey = `n${node.seq}_${index}`
  if (node.kind === 'user') {
    const full = textOfContent(node.content)
    const open = expanded.has(baseKey)
    const long = full.length > 200
    return renderRow({
      key: baseKey,
      tone: 'user',
      label: '你',
      content: createElement('strong', null, open || !long ? full : truncate(full, 200)),
      action: long ? renderTextButton(open ? '收起' : '展开', () => { toggle(baseKey) }, open) : undefined,
    })
  }
  if (node.kind === 'assistant') return renderAssistantNode(node, baseKey, expanded, toggle)
  if (node.kind === 'tool-result') return renderToolResultNode(node, baseKey, expanded, toggle)
  if (node.kind === 'steering') {
    return renderRow({
      key: baseKey,
      tone: 'user',
      label: '你补充说',
      content: truncate(textOfContent(node.content), 200),
    })
  }
  return renderSystemNode(node, baseKey, expanded, toggle)
}

function runningStatus(call: TrailRunningCallLike | undefined): string {
  if (call === undefined || typeof call.time !== 'number') return '正在运行'
  return `正在运行 ${Math.max(0, Math.round((Date.now() - call.time) / 1000))}s`
}

function renderLiveRows(
  partial: TrailSnapshotLike['partial'],
  runningCalls: readonly TrailRunningCallLike[],
): ReactNode[] {
  const rows: ReactNode[] = []
  const representedCalls = new Set<number>()
  const blocks = partial?.blocks ?? []
  for (let i = 0; i < blocks.length; i++) {
    const block: TrailAssistantBlockLike = blocks[i]
    if (block.kind === 'text' && (block.text ?? '').trim() !== '') {
      rows.push(renderRow({
        key: `live-text-${i}`,
        tone: 'reply',
        label: 'AI 回复',
        content: truncate(block.text ?? '', 300),
        action: renderStatus('生成中…', 'replying'),
      }))
      continue
    }
    if (block.kind === 'reasoning') {
      rows.push(renderRow({
        key: `live-reason-${i}`,
        tone: 'think',
        label: 'AI 思考',
        content: truncate(block.text ?? '', 60),
        action: renderStatus('正在思考', 'thinking'),
      }))
      continue
    }
    if (block.kind === 'tool-call') {
      const label = toolLabel(block.name)
      const preview = argPreview(block.name, block.argsRaw)
      const callIndex = runningCalls.findIndex((call, runningIndex) => !representedCalls.has(runningIndex) && call.name === block.name)
      if (callIndex >= 0) representedCalls.add(callIndex)
      rows.push(renderRow({
        key: `live-tool-${i}`,
        tone: 'tool',
        content: createElement('span', null,
          createElement('strong', null, `${label[0]}${preview === '' ? '' : ` ${preview}`}`),
          label[1] === '' ? null : `：${label[1]}`),
        action: renderStatus(runningStatus(callIndex < 0 ? undefined : runningCalls[callIndex]), 'running'),
      }))
    }
  }
  for (let i = 0; i < runningCalls.length; i++) {
    if (representedCalls.has(i)) continue
    const call = runningCalls[i]
    rows.push(renderRow({
      key: `live-call-${i}`,
      tone: 'tool',
      content: createElement('strong', null, toolLabel(call.name)[0]),
      action: renderStatus(runningStatus(call), 'running'),
    }))
  }
  return rows
}

function renderRound(options: RoundRenderOptions): ReactNode {
  const meta = roundMeta(options.round)
  const duration = roundDuration(options.turnTimings, options.round.turn)
  const userText = firstUserText(options.round)
  const metaBits: string[] = []
  if (options.live) metaBits.push('正在运行')
  else if (duration !== null) metaBits.push(fmtDuration(duration))
  if (meta.model !== null) metaBits.push(meta.model)
  if (!options.live && meta.tokens !== null) metaBits.push(`${fmtTokens(meta.tokens)} token`)
  const title = options.round.turn === null ? '开始' : `第 ${options.round.turn} 轮`
  const rows: ReactNode[] = options.round.items.map((node, i) => renderNode(node, i, options.expanded, options.toggle))
  if (options.live) rows.push(...renderLiveRows(options.partial, options.runningCalls))
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
    userText === null ? null : createElement('span', { className: 'tf-turn-question' }, ` · 你问：${truncate(userText, 40)}`)),
  metaBits.length === 0 ? null : createElement('span', { className: 'tf-round-meta' }, metaBits.join(' · ')),
  createElement('span', { className: 'tf-chevron', 'aria-hidden': 'true' }, options.open ? '⌃' : '⌄')),
  options.open ? createElement('div', { className: 'tf-round-body' }, rows) : null)
}

function renderStandaloneLive(
  partial: TrailSnapshotLike['partial'],
  runningCalls: readonly TrailRunningCallLike[],
  status: ReturnType<typeof liveStatus>,
): ReactNode {
  return createElement('section', { key: 'live', className: 'tf-round tf-live' },
    createElement('div', { className: 'tf-round-head tf-round-head-static' },
      createElement('span', { className: 'tf-round-summary' },
        createElement('span', { className: 'tf-turn-title' }, '正在进行的回合')),
      createElement('span', { className: 'tf-round-meta' }, '正在运行'),
      status === null ? null : renderStatus(status[0] + (status[1] === '' ? '' : `：${status[1]}`), 'running')),
    createElement('div', { className: 'tf-round-body' }, renderLiveRows(partial, runningCalls)))
}

/** Session-scoped storyline view registered under the trajectory tab. */
export function TrajectoryView(props: TrailViewProps): ReactNode {
  const { useSession } = props
  const nodes = useSession(s => s.nodes ?? EMPTY_NODES)
  const turnTimings = useSession(s => s.turnTimings)
  const partial = useSession(s => s.partial)
  const runningCalls = useSession(s => s.runningCalls ?? EMPTY_CALLS)
  const hasMore = useSession(s => s.hasMore)
  const loadingOlder = useSession(s => s.loadingOlder)
  const openState = useSession(s => s.openState)

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [roundOverrides, setRoundOverrides] = useState<Map<string, boolean>>(() => new Map())
  const [legendOpen, setLegendOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [paging, setPaging] = useState(false)

  const toggle = (key: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const rounds = buildRounds(nodes)
  const q = query.trim().toLowerCase()
  const visibleRounds = rounds
    .map((round, index) => ({ round, index }))
    .filter(item => q === '' || roundText(item.round).toLowerCase().includes(q))
  const live = partial !== null || runningCalls.length > 0
  const liveIndex = liveRoundIndex(rounds.length, live)
  const liveRoundVisible = liveIndex !== null && visibleRounds.some(item => item.index === liveIndex)
  const status = liveStatus(partial, runningCalls)

  const loadEarlier = (): void => {
    setPaging(true)
    const result = props.loadOlder === undefined ? Promise.resolve(false) : props.loadOlder()
    void result.then(() => { setPaging(false) }, () => { setPaging(false) })
  }

  const children: ReactNode[] = [
    createElement('h2', { key: 'title', className: 'tf-title' }, '轨迹'),
    createElement('div', { key: 'top', className: 'tf-top' },
      createElement('label', { className: 'tf-search-field' },
        createElement('span', { className: 'tf-search-icon', 'aria-hidden': 'true' }, '⌕'),
        createElement('input', {
          type: 'search',
          className: 'tf-search',
          placeholder: '搜索轨迹…',
          value: query,
          onChange: (event) => { setQuery(event.target.value) },
          'aria-label': '搜索轨迹',
        })),
      createElement('button', {
        type: 'button',
        className: 'tf-btn tf-legend-toggle',
        onClick: () => { setLegendOpen(!legendOpen) },
        'aria-expanded': legendOpen,
      },
      legendOpen ? '隐藏图例' : '显示图例',
      createElement('span', { className: 'tf-button-chevron', 'aria-hidden': 'true' }, legendOpen ? '⌃' : '⌄'))),
  ]
  if (legendOpen) {
    children.push(createElement('div', { key: 'legend', className: 'tf-legend' },
      LEGEND_ITEMS.map(item => createElement('span', { key: item.label, className: 'tf-legend-item' },
        renderIcon(item.tone),
        createElement('span', null, item.label)))))
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
    for (const item of visibleRounds) {
      const key = roundKey(item.round, item.index)
      const isLive = item.index === liveIndex
      const defaultOpen = item.index < 2 || isLive
      const open = roundOverrides.get(key) ?? defaultOpen
      content.push(renderRound({
        round: item.round,
        index: item.index,
        turnTimings,
        expanded,
        toggle,
        open,
        toggleRound: () => {
          setRoundOverrides((prev) => {
            const next = new Map(prev)
            next.set(key, !(next.get(key) ?? defaultOpen))
            return next
          })
        },
        live: isLive,
        partial,
        runningCalls,
      }))
    }
    if (visibleRounds.length === 0) {
      content.push(createElement('div', { key: 'nomatch', className: 'tf-loading' }, '没有找到相关内容'))
    }
    if (live && !liveRoundVisible) content.push(renderStandaloneLive(partial, runningCalls, status))
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
