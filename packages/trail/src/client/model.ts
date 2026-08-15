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
  call?: { name?: unknown; argsRaw?: unknown } | null
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

/** One running tool call as far as the trail view cares. */
export interface TrailRunningCallLike {
  name?: string
  time?: number
}

/** Top-level conversation snapshot fields the view reads. */
export interface TrailSnapshotLike {
  nodes?: readonly TrailNode[]
  turnTimings?: ReadonlyMap<number, TrailTurnTiming>
  partial?: { blocks?: readonly TrailAssistantBlockLike[] } | null
  runningCalls?: readonly TrailRunningCallLike[]
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
  runningCalls: readonly TrailRunningCallLike[],
): TrailLiveStatus {
  if (runningCalls.length > 0) {
    const names = runningCalls.map(call => toolLabel(call.name)[0]).join('、')
    const elapsed = runningElapsedSeconds(runningCalls)
    return ['正在运行工具', elapsed === null ? names : `${names} · ${elapsed}s`]
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
    if (hasText) return ['生成中…', '']
    return ['正在工作', '']
  }
  return null
}

/** @param calls - running calls. @returns longest elapsed seconds, or null. */
export function runningElapsedSeconds(calls: readonly TrailRunningCallLike[]): number | null {
  let longest: number | null = null
  const now = Date.now()
  for (const call of calls) {
    if (typeof call.time !== 'number') continue
    const elapsed = Math.max(0, Math.round((now - call.time) / 1000))
    if (longest === null || elapsed > longest) longest = elapsed
  }
  return longest
}

/** Argument keys worth previewing per tool, in preference order. */
const ARG_KEYS: Readonly<Record<string, readonly string[]>> = {
  read: ['file_path', 'path'],
  write: ['file_path', 'path'],
  edit: ['file_path', 'path'],
  read_image: ['file_path', 'path'],
  glob: ['pattern', 'path'],
  grep: ['pattern', 'path', 'include'],
  bash: ['command'],
  pwsh: ['command'],
  web_search: ['query'],
  web_fetch: ['url', 'urls'],
  skill: ['name'],
  todo_write: ['content'],
  ask_user_question: ['question', 'questions'],
  subagent: ['prompt', 'description'],
  subagent_fork: ['prompt', 'description'],
  send_message: ['message'],
  workflow: ['objective'],
  create_goal: ['objective'],
  update_goal: ['objective'],
  ralph: ['objective'],
  interrupt_agent: ['agent_id'],
  job_output: ['job_id'],
  job_kill: ['job_id'],
  list_agents: ['scope'],
  cordis_define: ['pluginId', 'idPrefix'],
  cordis_run: ['pluginId'],
  cordis_stop: ['pluginId'],
  cordis_undefine: ['pluginId'],
  cordis_inspect_self: ['pluginId'],
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

/**
 * Extract a short argument preview from a raw tool-arguments JSON string:
 * per-tool preferred keys first, then any first string value, then the raw
 * text itself.
 * @param name - tool name.
 * @param argsRaw - raw arguments JSON.
 */
export function argPreview(name: string | undefined, argsRaw: string | undefined): string {
  if (typeof argsRaw !== 'string' || argsRaw.trim() === '') return ''
  let parsed: unknown = null
  try {
    parsed = JSON.parse(argsRaw)
  } catch {
    parsed = null
  }
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const keys = name === undefined ? [] : ARG_KEYS[name] ?? []
    for (const key of keys) {
      const found = firstString((parsed as Record<string, unknown>)[key])
      if (found !== null) return truncate(found, 60)
    }
    for (const key of Object.keys(parsed)) {
      const found = firstString((parsed as Record<string, unknown>)[key])
      if (found !== null) return truncate(found, 60)
    }
  }
  return truncate(argsRaw, 60)
}

/** @param text - result text. @returns first non-empty line, truncated. */
export function firstLine(text: string): string | null {
  const line = text.split('\n').map(part => part.trim()).find(part => part !== '')
  return line === undefined ? null : truncate(line, 60)
}
