/** Friendly trajectory view: turn-grouped storyline over the session snapshot. */
import { createElement, useState } from 'react'
import type { ReactNode } from 'react'
import { toolLabel } from './tool-info'
import {
  argPreview, buildRounds, firstLine, firstUserText, fmtDuration, fmtTokens, liveStatus,
  roundMeta, roundText, textOfContent, truncate, usageSummary,
} from './model'
import type {
  TrailAssistantBlockLike, TrailNode, TrailRunningCallLike, TrailSnapshotLike, TrailTurnTiming,
} from './model'

/** Props the conversation view slot hands to this component. */
export interface TrailViewProps {
  useSession: <S>(selector: (snapshot: TrailSnapshotLike) => S) => S
  loadOlder?: () => Promise<boolean>
}

const EMPTY_NODES: readonly TrailNode[] = []
const EMPTY_CALLS: readonly TrailRunningCallLike[] = []

const LEGEND_ITEMS = [
  '👤 你（用户）', '》 向 AI 回复', '🧠 AI 思考', '🔧 工具调用',
  '✓ 成功结果', '✗ 错误结果', 'ℹ️ 系统事件',
] as const

function roundDuration(turnTimings: ReadonlyMap<number, TrailTurnTiming> | undefined, turn: number | null): number | null {
  if (turn === null || turnTimings === undefined) return null
  const timing = turnTimings.get(turn)
  if (timing === undefined || typeof timing.startTime !== 'number' || typeof timing.endTime !== 'number') return null
  return timing.endTime - timing.startTime
}

function renderNode(node: TrailNode, index: number, expanded: ReadonlySet<string>, toggle: (key: string) => void): ReactNode {
  const baseKey = `n${node.seq}_${index}`
  if (node.kind === 'user') {
    const full = textOfContent(node.content)
    const open = expanded.has(baseKey)
    const long = full.length > 200
    return createElement('div', { key: baseKey, className: 'tf-row tf-user' },
      '👤 你：',
      createElement('span', null, open || !long ? full : truncate(full, 200)),
      long ? createElement('button', { type: 'button', className: 'tf-btn', onClick: () => { toggle(baseKey) } }, open ? '收起' : '展开') : null)
  }
  if (node.kind === 'assistant') {
    const rows: ReactNode[] = []
    const blocks = node.blocks ?? []
    for (let b = 0; b < blocks.length; b++) {
      const block = blocks[b]
      const bKey = `${baseKey}_b${b}`
      if (block.kind === 'text') {
        const full = block.text ?? ''
        if (full.trim() === '') continue
        const open = expanded.has(bKey)
        const long = full.length > 300
        rows.push(createElement('div', { key: bKey, className: 'tf-row tf-reply' },
          '》 AI 回复：',
          createElement('span', null, open || !long ? full : truncate(full, 300)),
          long ? createElement('button', { type: 'button', className: 'tf-btn', onClick: () => { toggle(bKey) } }, open ? '收起' : '展开') : null))
      } else if (block.kind === 'reasoning') {
        const full = block.text ?? ''
        if (full.trim() === '') continue
        const open = expanded.has(bKey)
        rows.push(createElement('div', { key: bKey, className: 'tf-row tf-think' },
          '🧠 AI 思考：',
          createElement('span', null, open ? full : truncate(full, 60)),
          createElement('button', { type: 'button', className: 'tf-btn', onClick: () => { toggle(bKey) } }, open ? '收起' : '展开')))
      } else if (block.kind === 'tool-call') {
        const label = toolLabel(block.name)
        const preview = argPreview(block.name, block.argsRaw)
        const open = expanded.has(bKey)
        rows.push(createElement('div', { key: bKey, className: 'tf-row tf-tool' },
          `🔧 ${label[0]}${preview !== '' ? ` ${preview}` : ''}：${label[1]}`,
          createElement('button', { type: 'button', className: 'tf-btn', onClick: () => { toggle(bKey) } }, open ? '收起详情' : '详情'),
          open ? createElement('pre', { className: 'tf-detail' }, typeof block.argsRaw === 'string' && block.argsRaw !== '' ? block.argsRaw : '（无参数）') : null))
      } else if (block.kind === 'image') {
        rows.push(createElement('div', { key: bKey, className: 'tf-row' }, '🖼 AI 生成了一张图片'))
      } else {
        rows.push(createElement('div', { key: bKey, className: 'tf-row' }, 'ℹ️ 系统事件：其他内容'))
      }
    }
    if (node.interrupted) rows.push(createElement('div', { key: `${baseKey}_stop`, className: 'tf-row tf-meta' }, '已停止'))
    const metaBits: string[] = []
    if (typeof node.step === 'number') metaBits.push(`第 ${node.step} 步`)
    if (typeof node.provenance?.model === 'string') metaBits.push(node.provenance.model)
    const usage = usageSummary(node.usage)
    if (usage !== null) metaBits.push(usage)
    rows.push(createElement('div', { key: `${baseKey}_meta`, className: 'tf-meta' }, metaBits.join(' · ')))
    return createElement('div', { key: baseKey }, rows)
  }
  if (node.kind === 'tool-result') {
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
    const children: ReactNode[] = []
    if (node.isError === true) {
      const errName = node.error !== null && node.error !== undefined
        ? ((node.error.name || node.error.code) ?? '未知错误')
        : '未知错误'
      children.push(`✗ ${label[0]} 出错：${String(errName)}`)
    } else {
      children.push(`✓ ${label[0]} 完成${callPreview !== '' ? `：${callPreview}` : ''}`)
      if (headline !== null) children.push(createElement('span', { className: 'tf-meta' }, ` · 预览第一行：${headline}`))
    }
    if (duration !== null) children.push(createElement('span', { className: 'tf-meta' }, ` · 耗时 ${duration}`))
    children.push(createElement('button', { type: 'button', className: 'tf-btn', onClick: () => { toggle(baseKey) } }, open ? '收起详情' : '详情'))
    if (open) {
      const detail = [preview === '' ? '（无文本结果）' : preview]
      if (duration !== null) detail.push(`耗时：${duration}`)
      if (node.error !== null && node.error !== undefined) {
        detail.push(`错误：${String(node.error.name ?? '')}${node.error.code !== undefined && node.error.code !== null ? `（${String(node.error.code)}）` : ''}`)
      }
      children.push(createElement('pre', { className: 'tf-detail' }, detail.join('\n')))
    }
    return createElement('div', { key: baseKey, className: 'tf-row tf-result' }, children)
  }
  if (node.kind === 'context') return createElement('div', { key: baseKey, className: 'tf-row' }, 'ℹ️ 系统事件：注入了上下文信息')
  if (node.kind === 'compaction') {
    const open = expanded.has(baseKey)
    const bits: string[] = []
    if (typeof node.shadowedItemCount === 'number') bits.push(`${node.shadowedItemCount} 条记录`)
    if (typeof node.shadowedTokenCount === 'number') bits.push(`${node.shadowedTokenCount} token`)
    const children: ReactNode[] = ['ℹ️ 系统事件：历史压缩，把之前的对话压缩成摘要，节省 token']
    if (bits.length > 0) children.push(createElement('span', { className: 'tf-meta' }, `（${bits.join('、')}）`))
    if (node.summary !== null && node.summary !== undefined) {
      children.push(createElement('button', { type: 'button', className: 'tf-btn', onClick: () => { toggle(baseKey) } }, open ? '收起摘要' : '摘要'))
    }
    if (open && node.summary !== null && node.summary !== undefined) {
      children.push(createElement('pre', { className: 'tf-detail' }, node.summary))
    }
    return createElement('div', { key: baseKey, className: 'tf-row' }, children)
  }
  if (node.kind === 'steering') return createElement('div', { key: baseKey, className: 'tf-row' }, `👤 你补充说：${truncate(textOfContent(node.content), 200)}`)
  if (node.kind === 'turn-error') {
    return createElement('div', { key: baseKey, className: 'tf-row tf-error' },
      `✗ 本轮出错：${node.message ?? '未知错误'}${typeof node.code === 'string' && node.code !== '' ? `（${node.code}）` : ''}`)
  }
  if (node.kind === 'turn-max-tokens') return createElement('div', { key: baseKey, className: 'tf-row' }, 'ℹ️ 系统事件：回复达到长度上限，被截断')
  if (node.kind === 'model-retry') return createElement('div', { key: baseKey, className: 'tf-row' }, 'ℹ️ 系统事件：模型请求失败，已自动重试')
  return createElement('div', { key: baseKey, className: 'tf-row' }, `ℹ️ 系统事件：其他（${String(node.kind)}）`)
}

function renderRound(
  round: ReturnType<typeof buildRounds>[number],
  index: number,
  turnTimings: ReadonlyMap<number, TrailTurnTiming> | undefined,
  expanded: ReadonlySet<string>,
  toggle: (key: string) => void,
): ReactNode {
  const meta = roundMeta(round)
  const duration = roundDuration(turnTimings, round.turn)
  const userText = firstUserText(round)
  const metaBits: string[] = []
  if (duration !== null) metaBits.push(fmtDuration(duration))
  if (meta.model !== null) metaBits.push(meta.model)
  if (meta.tokens !== null) metaBits.push(`${fmtTokens(meta.tokens)} token`)
  const head: ReactNode[] = [
    createElement('span', { key: 't', className: 'tf-turn-title' }, round.turn === null ? '开始' : `第 ${round.turn} 轮`),
    userText !== null
      ? createElement('span', { key: 'q', className: 'tf-turn-question' }, `· 你问：${truncate(userText, 40)}`)
      : null,
  ]
  if (metaBits.length > 0) head.push(createElement('span', { key: 'm', className: 'tf-meta' }, metaBits.join(' · ')))
  const rows: ReactNode[] = round.items.map((node, i) => renderNode(node, i, expanded, toggle))
  return createElement('div', { key: `r${index}`, className: 'tf-round' },
    createElement('div', { className: 'tf-round-head' }, head),
    rows)
}

function renderLive(
  partial: TrailSnapshotLike['partial'],
  runningCalls: readonly TrailRunningCallLike[],
  status: ReturnType<typeof liveStatus>,
): ReactNode {
  const rows: ReactNode[] = []
  if (partial !== null && partial !== undefined && partial.blocks !== undefined) {
    for (let i = 0; i < partial.blocks.length; i++) {
      const block: TrailAssistantBlockLike = partial.blocks[i]
      if (block.kind === 'text' && (block.text ?? '').trim() !== '') {
        rows.push(createElement('div', { key: `t${i}`, className: 'tf-row' }, `》 正在回复：${truncate(block.text ?? '', 300)}`))
      } else if (block.kind === 'reasoning') {
        rows.push(createElement('div', { key: `t${i}`, className: 'tf-row tf-think' }, `🧠 AI 思考：${truncate(block.text ?? '', 60)}`))
      } else if (block.kind === 'tool-call') {
        const label = toolLabel(block.name)
        const preview = argPreview(block.name, block.argsRaw)
        rows.push(createElement('div', { key: `t${i}`, className: 'tf-row tf-tool' }, `🔧 ${label[0]}${preview !== '' ? ` ${preview}` : ''}：${label[1]}`))
      }
    }
  }
  for (let i = 0; i < runningCalls.length; i++) {
    const call = runningCalls[i]
    const label = toolLabel(call.name)
    const elapsed = typeof call.time === 'number'
      ? Math.max(0, Math.round((Date.now() - call.time) / 1000))
      : null
    rows.push(createElement('div', { key: `c${i}`, className: 'tf-row tf-tool' },
      `🔧 ${label[0]} 运行中${elapsed !== null ? ` · 已运行 ${elapsed}s` : ''}`))
  }
  return createElement('div', { key: 'live', className: 'tf-round tf-live' },
    createElement('div', { className: 'tf-round-head' },
      '🔄 正在进行的回合 · 正在运行',
      status === null
        ? null
        : createElement('span', { className: 'tf-badge' }, status[0] + (status[1] !== '' ? `：${status[1]}` : ''))),
    rows)
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
  const visibleRounds = q === '' ? rounds : rounds.filter(round => roundText(round).toLowerCase().includes(q))
  const live = partial !== null || runningCalls.length > 0
  const status = liveStatus(partial, runningCalls)

  const loadEarlier = (): void => {
    setPaging(true)
    const result = props.loadOlder === undefined ? Promise.resolve(false) : props.loadOlder()
    void result.then(() => { setPaging(false) }, () => { setPaging(false) })
  }

  const children: ReactNode[] = []
  children.push(createElement('div', { key: 'top', className: 'tf-top' },
    createElement('input', {
      type: 'search',
      className: 'tf-search',
      placeholder: '搜索轨迹…',
      value: query,
      onChange: (event) => { setQuery(event.target.value) },
      'aria-label': '搜索轨迹',
    }),
    createElement('button', { type: 'button', className: 'tf-btn', onClick: () => { setLegendOpen(!legendOpen) } },
      legendOpen ? '隐藏图例 ▾' : '图例 ▸')))
  if (legendOpen) {
    children.push(createElement('div', { key: 'legend', className: 'tf-legend' },
      LEGEND_ITEMS.map(item => createElement('span', { key: item, className: 'tf-legend-item' }, item))))
  }

  if (openState === 'loading') {
    children.push(createElement('div', { key: 'loading', className: 'tf-loading' }, '正在加载记录…'))
  } else if (openState === 'error') {
    children.push(createElement('div', { key: 'error', className: 'tf-loading' }, '记录加载失败'))
  } else if (rounds.length === 0 && !live) {
    children.push(createElement('div', { key: 'empty', className: 'tf-empty' },
      createElement('div', { className: 'tf-empty-title' }, '还没有轨迹。'),
      createElement('div', null, '给 AI 发一条消息，这里会记录完整的互动过程。')))
  } else {
    for (let i = 0; i < visibleRounds.length; i++) {
      children.push(renderRound(visibleRounds[i], i, turnTimings, expanded, toggle))
    }
    if (visibleRounds.length === 0) children.push(createElement('div', { key: 'nomatch', className: 'tf-loading' }, '没有找到相关内容'))
    if (live) children.push(renderLive(partial, runningCalls, status))
    if (hasMore) {
      children.push(createElement('button', {
        key: 'more',
        type: 'button',
        className: 'tf-btn',
        style: { alignSelf: 'center' },
        disabled: loadingOlder === true || paging,
        onClick: loadEarlier,
      }, loadingOlder === true || paging ? '加载中…' : '加载更早记录'))
    }
  }

  return createElement('div', { className: 'tf-root' }, children)
}
