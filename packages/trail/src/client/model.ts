/** Pure trail model: structural node types plus grouping and text helpers. */
import { toolLabel } from './tool-info'

/** Row categories available to the trail filter. */
export type TrailTone = 'user' | 'reply' | 'think' | 'tool' | 'success' | 'error' | 'system' | 'other'

/** Stable category order used by rendering and persisted preferences. */
export const TRAIL_TONES: readonly TrailTone[] = [
  'user', 'reply', 'think', 'tool', 'success', 'error', 'system', 'other',
]

const TRAIL_TONE_SET = new Set<string>(TRAIL_TONES)

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

/** @returns whitespace-normalized single-line text, truncated when needed. */
export function summaryText(text: string, limit: number): string {
  return truncate(text.replace(/\s+/g, ' ').trim(), limit)
}

function compactSearchText(text: string): string {
  return text.normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, '')
}

function isOrderedSubsequence(needle: string, haystack: string): boolean {
  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) index++
    if (index === needle.length) return true
  }
  return false
}

/**
 * Match every query term against one search document. Punctuation, whitespace,
 * case and full-width forms are ignored; multi-character terms may match as an
 * ordered subsequence.
 */
export function matchesSearchText(document: string, query: string): boolean {
  const normalizedQuery = query.normalize('NFKC').toLocaleLowerCase().trim()
  if (normalizedQuery === '') return true
  const haystack = compactSearchText(document)
  const terms = normalizedQuery.split(/\s+/).map(compactSearchText).filter(term => term !== '')
  return terms.every((term) => {
    if (haystack.includes(term)) return true
    return term.length > 1 && isOrderedSubsequence(term, haystack)
  })
}

/** Parse persisted category IDs, falling back to every category on bad data. */
export function parseVisibleTones(raw: string | null): readonly TrailTone[] {
  if (raw === null) return TRAIL_TONES
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return TRAIL_TONES
  }
  if (!Array.isArray(parsed)) return TRAIL_TONES
  const tones: TrailTone[] = []
  for (const value of parsed) {
    if (typeof value !== 'string' || !TRAIL_TONE_SET.has(value)) continue
    const tone = value as TrailTone
    if (!tones.includes(tone)) tones.push(tone)
  }
  return tones.length === 0 ? TRAIL_TONES : tones
}

/** Derive the next non-empty category selection from one filter click. */
export function toggleVisibleTone(current: ReadonlySet<TrailTone>, tone: TrailTone): readonly TrailTone[] {
  if (current.size === TRAIL_TONES.length) return [tone]
  if (current.size === 1 && current.has(tone)) return TRAIL_TONES
  const next = new Set(current)
  if (next.has(tone)) next.delete(tone)
  else next.add(tone)
  return TRAIL_TONES.filter(value => next.has(value))
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

/** @param block - assistant block. @returns full searchable text including hidden details. */
export function assistantBlockText(block: TrailAssistantBlockLike): string {
  if (block.kind === 'text') return `AI 回复 回复 assistant ${block.text ?? ''}`
  if (block.kind === 'reasoning') return `AI 思考 思考 reasoning ${block.text ?? ''}`
  if (block.kind === 'tool-call') {
    const label = toolLabel(block.name)
    return `工具调用 tool ${block.name ?? ''} ${label[0]} ${label[1]} ${block.argsRaw ?? ''}`
  }
  return `${block.kind} ${block.text ?? ''} ${block.name ?? ''} ${block.argsRaw ?? ''}`
}

function searchValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'string' ? value : String(value)
}

/** @param node - one trail node. @returns full searchable text including hidden details. */
export function nodeText(node: TrailNode): string {
  if (node.kind === 'user') return `你 用户 提问 user ${textOfContent(node.content)}`
  if (node.kind === 'steering') return `你补充说 用户 补充 steering ${textOfContent(node.content)}`
  if (node.kind === 'context') return `系统事件 注入上下文 context ${textOfContent(node.content)}`
  if (node.kind === 'assistant') {
    let out = ''
    for (const block of node.blocks ?? []) out += `${assistantBlockText(block)} `
    return out
  }
  if (node.kind === 'tool-result') {
    const name = node.call !== null && node.call !== undefined && typeof node.call.name === 'string' ? node.call.name : ''
    const argsRaw = node.call !== null && node.call !== undefined ? searchValue(node.call.argsRaw) : ''
    const label = toolLabel(name === '' ? undefined : name)
    return [
      node.isError === true ? '错误结果 失败 error' : '成功结果 成功 success',
      name, label[0], label[1], argsRaw, textOfContent(node.content),
      searchValue(node.error?.name), searchValue(node.error?.code),
    ].join(' ')
  }
  if (node.kind === 'compaction') return `系统事件 历史压缩 compaction ${node.summary ?? ''}`
  if (node.kind === 'turn-error') return `错误结果 本轮出错 error ${node.message ?? ''} ${node.code ?? ''}`
  if (node.kind === 'turn-max-tokens') return '系统事件 回复达到长度上限 turn max tokens'
  if (node.kind === 'model-retry') return `系统事件 模型自动重试 model retry ${node.retryState ?? ''}`
  return `其他 系统事件 ${node.kind}`
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

/** @returns latest round index receiving live content, or null for a standalone live card. */
export function liveRoundIndex(roundCount: number, live: boolean): number | null {
  if (!live || roundCount === 0) return null
  return roundCount - 1
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
    if (Object.keys(parsed).length === 0) return ''
  }
  return truncate(argsRaw, 60)
}
