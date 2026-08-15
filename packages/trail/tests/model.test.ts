import { describe, expect, it } from 'vitest'
import {
  argPreview, buildRounds, firstLine, firstUserText, fmtDuration, fmtTokens, liveStatus,
  nodeText, roundMeta, textOfContent, truncate, usageSummary,
} from '../src/client/model'
import type { TrailAssistantBlockLike, TrailNode } from '../src/client/model'
import { toolLabel } from '../src/client/tool-info'

function user(seq: number, text: string): TrailNode {
  return { kind: 'user', seq, content: [{ type: 'text', text }] }
}

function assistant(seq: number, turn: number, step: number, blocks: TrailAssistantBlockLike[] = []): TrailNode {
  return { kind: 'assistant', seq, turn, step, blocks }
}

function toolResult(seq: number, name: string, ok = true): TrailNode {
  return {
    kind: 'tool-result',
    seq,
    time: 100,
    callTime: 0,
    call: { name },
    content: [{ type: 'text', text: 'ok' }],
    isError: !ok,
  }
}

describe('toolLabel', () => {
  it('maps a known tool to a friendly Chinese pair', () => {
    expect(toolLabel('read')).toEqual(['读取文件', '查看文件内容'])
  })

  it('falls back for unknown tools', () => {
    expect(toolLabel('made-up-tool')).toEqual(['调用工具 made-up-tool', ''])
  })
})

describe('buildRounds', () => {
  it('opens a round on every user node and attaches turn numbers', () => {
    const rounds = buildRounds([
      user(1, '你好'),
      assistant(2, 1, 1, [{ kind: 'text', text: '回复' }]),
      user(3, '继续'),
      assistant(4, 2, 1, [{ kind: 'text', text: '回复 2' }]),
    ])
    expect(rounds).toHaveLength(2)
    expect(rounds[0]?.turn).toBe(1)
    expect(rounds[1]?.turn).toBe(2)
    expect(rounds[0]?.items).toHaveLength(2)
    expect(rounds[1]?.items).toHaveLength(2)
  })

  it('keeps turn-less nodes in the current round', () => {
    const rounds = buildRounds([
      user(1, '问'),
      assistant(2, 3, 1, [{ kind: 'tool-call', name: 'read', argsRaw: '{}' }]),
      toolResult(3, 'read'),
      assistant(4, 3, 2, [{ kind: 'text', text: '好了' }]),
    ])
    expect(rounds).toHaveLength(1)
    expect(rounds[0]?.turn).toBe(3)
    expect(rounds[0]?.items).toHaveLength(4)
  })

  it('splits when a new turn number appears without a user node', () => {
    const rounds = buildRounds([
      assistant(1, 1, 1, [{ kind: 'text', text: 'a' }]),
      assistant(2, 2, 1, [{ kind: 'text', text: 'b' }]),
    ])
    expect(rounds).toHaveLength(2)
    expect(rounds[0]?.turn).toBe(1)
    expect(rounds[1]?.turn).toBe(2)
  })

  it('leads with a turn-less round when the first node carries no turn', () => {
    const rounds = buildRounds([
      { kind: 'context', seq: 1 },
      user(2, '问'),
      assistant(3, 1, 1, [{ kind: 'text', text: '答' }]),
    ])
    expect(rounds).toHaveLength(2)
    expect(rounds[0]?.turn).toBeNull()
    expect(rounds[1]?.turn).toBe(1)
  })
})

describe('nodeText', () => {
  it('joins user content text blocks', () => {
    expect(nodeText(user(1, '你好'))).toBe('你好')
  })

  it('collects assistant text, reasoning and tool names', () => {
    const node = assistant(2, 1, 1, [
      { kind: 'text', text: '答复' },
      { kind: 'reasoning', text: '思路' },
      { kind: 'tool-call', name: 'grep', argsRaw: '{}' },
    ])
    expect(nodeText(node)).toBe('答复 思路 grep ')
  })

  it('prefixes tool results with the call name', () => {
    expect(nodeText(toolResult(3, 'read'))).toBe('read ok')
  })
})

describe('text helpers', () => {
  it('truncates beyond the limit with an ellipsis', () => {
    expect(truncate('12345', 3)).toBe('123…')
    expect(truncate('123', 3)).toBe('123')
  })

  it('formats durations in Chinese units', () => {
    expect(fmtDuration(59_000)).toBe('59 秒')
    expect(fmtDuration(60_000)).toBe('1 分钟')
    expect(fmtDuration(90_000)).toBe('1 分 30 秒')
  })

  it('formats token counts compactly', () => {
    expect(fmtTokens(999)).toBe('999')
    expect(fmtTokens(1500)).toBe('1.5k')
  })
})

describe('meta aggregation', () => {
  it('sums usage across assistant steps and reports the model', () => {
    const rounds = buildRounds([
      user(1, '问'),
      { kind: 'assistant', seq: 2, turn: 1, step: 1, provenance: { model: 'deepseek-v4-pro' }, usage: { inputTokens: 10, outputTokens: 20 }, blocks: [] },
      { kind: 'assistant', seq: 3, turn: 1, step: 2, usage: { outputTokens: 5 }, blocks: [] },
    ])
    expect(roundMeta(rounds[0]!)).toEqual({ model: 'deepseek-v4-pro', tokens: 35 })
  })

  it('ignores malformed usage fields', () => {
    expect(usageSummary({ inputTokens: 'many' })).toBeNull()
    expect(usageSummary({ inputTokens: 4 })).toBe('约 4 token')
  })
})

describe('firstUserText', () => {
  it('finds the round question and normalizes whitespace', () => {
    const rounds = buildRounds([user(1, '  给项目\n加个  README '), assistant(2, 1, 1, [])])
    expect(firstUserText(rounds[0]!)).toBe('给项目 加个 README')
  })

  it('returns null without a user node', () => {
    const rounds = buildRounds([{ kind: 'context', seq: 1 }])
    expect(firstUserText(rounds[0]!)).toBeNull()
  })
})

describe('liveStatus', () => {
  it('prefers running tool calls', () => {
    expect(liveStatus(null, [{ name: 'read' }])).toEqual(['正在运行工具', '读取文件'])
  })

  it('derives phase from partial blocks', () => {
    expect(liveStatus({ blocks: [{ kind: 'tool-call', name: 'grep', argsRaw: '{}' }] }, [])).toEqual(['正在调用工具', ''])
    expect(liveStatus({ blocks: [{ kind: 'reasoning', text: '想' }] }, [])).toEqual(['正在思考', ''])
    expect(liveStatus({ blocks: [{ kind: 'text', text: '写' }] }, [])).toEqual(['生成中…', ''])
    expect(liveStatus({ blocks: [] }, [])).toEqual(['正在工作', ''])
  })

  it('is null when nothing runs', () => {
    expect(liveStatus(null, [])).toBeNull()
  })
})

describe('textOfContent', () => {
  it('concatenates only text blocks', () => {
    expect(textOfContent([
      { type: 'text', text: 'a' },
      { type: 'image' },
      { type: 'text', text: 'b' },
    ])).toBe('ab')
  })

  it('handles undefined content', () => {
    expect(textOfContent(undefined)).toBe('')
  })
})

describe('argPreview', () => {
  it('prefers the tool-specific key', () => {
    expect(argPreview('read', JSON.stringify({ file_path: 'docs/design.md', offset: 1 }))).toBe('docs/design.md')
    expect(argPreview('bash', JSON.stringify({ command: 'git status' }))).toBe('git status')
    expect(argPreview('web_search', JSON.stringify({ query: 'deepseek harness' }))).toBe('deepseek harness')
  })

  it('falls back to the first string value then the raw text', () => {
    expect(argPreview('made-up', JSON.stringify({ whatever: 'hello' }))).toBe('hello')
    expect(argPreview('read', 'not json at all')).toBe('not json at all')
  })

  it('handles empty input', () => {
    expect(argPreview('read', '')).toBe('')
    expect(argPreview(undefined, undefined)).toBe('')
  })
})

describe('firstLine', () => {
  it('returns the first non-empty line truncated', () => {
    expect(firstLine('\n\n# 项目设计文档\n正文')).toBe('# 项目设计文档')
  })

  it('returns null for empty text', () => {
    expect(firstLine('  \n ')).toBeNull()
  })
})
