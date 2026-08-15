/** Pure trail model: structural node types plus grouping and text helpers. */
import { toolLabel } from './tool-info'

/** One content block as far as the trail view cares. */
export interface ContentBlockLike {
  type?: string
  text?: string
}

/** One assistant content block as far as the trail view cares. */
export interface TrailAssistantBlockLike {
  kind: string
  text?: string
  name?: string
  argsRaw?: string
}

/** Usage fields the view may sum; unknown shapes are ignored. */
export interface TrailUsageLike {
  inputTokens?: unknown
  outputTokens?: unknown
  reasoningTokens?: unknown
}

/**
 * One conversation node. Wire data is an unvalidated boundary: every field is
 * optional and `kind` stays a string, so unknown kinds fall through to the
 * default row without narrowing tricks.
 */
export interface TrailNode {
  kind: string
  seq: number
  time?: number
  turn?: number
  step?: number
  content?: readonly ContentBlockLike[]
  blocks?: readonly TrailAssistantBlockLike[]
  interrupted?: boolean
  usage?: TrailUsageLike
  provenance?: { model?: unknown }
  callTime?: number | null
  call?: { name?: unknown } | null
  isError?: boolean
  error?: { name?: unknown; code?: unknown } | null
  summary?: string | null
  shadowedItemCount?: number | null
  shadowedTokenCount?: number | null
  message?: string
  code?: string
  retryState?: string
}

/** One grouping of nodes presented as a single turn card. */
export interface TrailRound {
  turn: number | null
  items: TrailNode[]
}

/** Turn-timing entry as far as the trail view cares. */
export interface TrailTurnTiming {
  startTime?: number
  endTime?: number
}

/** Top-level conversation snapshot fields the view reads. */
export interface TrailSnapshotLike {
  nodes?: readonly TrailNode[]
  turnTimings?: ReadonlyMap<number, TrailTurnTiming>
  partial?: { blocks?: readonly TrailAssistantBlockLike[] } | null
  runningCalls?: readonly { name?: string }[]
  hasMore?: boolean
  loadingOlder?: boolean
  openState?: string
}

/** @param content - content blocks. @returns concatenated text blocks. */
export function textOfContent(content: readonly ContentBlockLike[] | undefined): string {
  let out = ''
  const list = content ?? []
  for (const block of list) {
    if (block !== null && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string') {
      out += block.text
    }
  }
  return out
}

/** @param text - source text. @param limit - max length before ellipsis. */
export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}…`
}

/** @param ms - duration in milliseconds. @returns short Chinese duration. */
export function fmtDuration(ms: number): string {
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec} 秒`
  const min = Math.floor(sec / 60)
  const rest = sec % 60
  return rest === 0 ? `${min} 分钟` : `${min} 分 ${rest} 秒`
}

/** @param n - token count. @returns compact count. */
export function fmtTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/** @param node - one trail node. @returns searchable text summary. */
export function nodeText(node: TrailNode): string {
  if (node.kind === 'user' || node.kind === 'steering' || node.kind === 'context') return textOfContent(node.content)
  if (node.kind === 'assistant') {
    let out = ''
    for (const block of node.blocks ?? []) {
      if (block.kind === 'text' || block.kind === 'reasoning') out += `${block.text ?? ''} `
      else if (block.kind === 'tool-call') out += `${block.name ?? ''} `
    }
    return out
  }
  if (node.kind === 'tool-result') {
    const name = node.call !== null && node.call !== undefined && typeof node.call.name === 'string' ? node.call.name : ''
    return `${name} ${textOfContent(node.content)}`
  }
  if (node.kind === 'compaction') return node.summary ?? '历史压缩'
  if (node.kind === 'turn-error') return node.message ?? '出错'
  return ''
}

/**
 * Group nodes into rounds in seq order. A user node always opens a new round;
 * nodes carrying a turn number attach to that turn; other nodes follow the
 * current round.
 * @param nodes - conversation nodes in seq order.
 */
export function buildRounds(nodes: readonly TrailNode[]): TrailRound[] {
  const rounds: TrailRound[] = []
  let current: TrailRound | null = null
  for (const node of nodes) {
    if (node.kind === 'user') {
      current = { turn: null, items: [] }
      rounds.push(current)
      current.items.push(node)
      continue
    }
    const turn = node.kind === 'assistant' || node.kind === 'turn-error' || node.kind === 'turn-max-tokens'
      ? node.turn ?? null
      : null
    if (current === null) {
      current = { turn, items: [] }
      rounds.push(current)
    } else if (turn !== null && current.turn !== null && current.turn !== turn) {
      current = { turn, items: [] }
      rounds.push(current)
    } else if (turn !== null && current.turn === null) {
      current.turn = turn
    }
    current.items.push(node)
  }
  return rounds
}

/** @param round - one round. @returns concatenated searchable text. */
export function roundText(round: TrailRound): string {
  let out = ''
  for (const node of round.items) out += `${nodeText(node)} `
  return out
}

/** @param round - one round. @returns first user question, or null. */
export function firstUserText(round: TrailRound): string | null {
  for (const node of round.items) {
    if (node.kind !== 'user') continue
    const text = textOfContent(node.content).replace(/\s+/g, ' ').trim()
    if (text !== '') return text
  }
  return null
}

/** Model name and token totals aggregated over a round's assistant steps. */
export interface TrailRoundMeta {
  model: string | null
  tokens: number | null
}

/** @param round - one round. @returns aggregated model and token meta. */
export function roundMeta(round: TrailRound): TrailRoundMeta {
  let model: string | null = null
  let tokens = 0
  let has = false
  for (const node of round.items) {
    if (node.kind !== 'assistant') continue
    if (model === null && typeof node.provenance?.model === 'string') model = node.provenance.model
    const usage = node.usage
    if (usage !== undefined && typeof usage === 'object') {
      if (typeof usage.inputTokens === 'number') { tokens += usage.inputTokens; has = true }
      if (typeof usage.outputTokens === 'number') { tokens += usage.outputTokens; has = true }
      if (typeof usage.reasoningTokens === 'number') { tokens += usage.reasoningTokens; has = true }
    }
  }
  return { model, tokens: has ? tokens : null }
}

/** @param usage - one assistant usage. @returns compact token summary or null. */
export function usageSummary(usage: TrailUsageLike | undefined): string | null {
  if (usage === undefined || typeof usage !== 'object') return null
  let tokens = 0
  let has = false
  if (typeof usage.inputTokens === 'number') { tokens += usage.inputTokens; has = true }
  if (typeof usage.outputTokens === 'number') { tokens += usage.outputTokens; has = true }
  if (typeof usage.reasoningTokens === 'number') { tokens += usage.reasoningTokens; has = true }
  return has ? `约 ${fmtTokens(tokens)} token` : null
}

/** Live badge text for a running round. */
export type TrailLiveStatus = readonly [label: string, detail: string] | null

/**
 * Derive the running-round badge. Running tool calls win; otherwise the
 * partial's block kinds pick between thinking and replying.
 */
export function liveStatus(
  partial: TrailSnapshotLike['partial'],
  runningCalls: readonly { name?: string }[],
): TrailLiveStatus {
  if (runningCalls.length > 0) {
    const names = runningCalls.map(call => toolLabel(call.name)[0]).join('、')
    return ['正在运行工具', names]
  }
  if (partial !== null && partial !== undefined && partial.blocks !== undefined) {
    let hasTool = false
    let hasReason = false
    let hasText = false
    for (const block of partial.blocks) {
      if (block.kind === 'tool-call') hasTool = true
      else if (block.kind === 'reasoning') hasReason = true
      else if (block.kind === 'text' && (block.text ?? '').trim() !== '') hasText = true
    }
    if (hasTool) return ['正在调用工具', '']
    if (hasReason && !hasText) return ['正在思考', '']
    if (hasText) return ['正在回复', '']
    return ['正在工作', '']
  }
  return null
}
