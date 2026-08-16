# Usage

How to install `dsh-trail` and read the Friendly Trajectory view.

## Install

```sh
dsh plugin --profile web add dsh-trail dsh-trail-bundle
```

Restart the profile. The 轨迹 (Trajectory) tab in the Web GUI is now the storyline
view; the bundle disables the shipped `ui-trajectory` row so exactly one 轨迹 tab
remains.

## What you see

The view reads the conversation top-down as a story. One collapsible **turn card**
per round holds the step rows in order:

| Row | Rendered as |
|---|---|
| User message | 💬 你: your question |
| Assistant text | 🤖 AI 回复: summary, expandable to full text |
| Reasoning | 🧠 AI 思考: folded by default, 60-character summary |
| Tool call | 🛠️ Chinese tool name + the touched file/command |
| Tool result | ✅ success (or ✕ failure) + argument preview |
| System events | ℹ️ one-line note (context, compaction, model retry, …) |
| Turn error | ✗ error message with code |

The card header shows turn number, elapsed duration, model and token total — but
only when the session snapshot provides them; nothing is invented.

## Interacting

- **展开** on a folded reasoning/reply row shows the full text with original line
  breaks.
- **详情** on a tool row expands a drawer with the tool note, raw arguments, full
  result, timing and error metadata.
- **Search** matches row summaries and hidden details. Matching ignores case,
  punctuation, whitespace and full-width forms; multi-word terms must all match, each
  as an ordered subsequence. Results keep their original time order.
- **Category filter** (全部 + eight categories) keeps only matching rows and their
  turns. Selections combine, persist across sessions in the browser, and invalid or
  empty stored data falls back to 全部.

## Live rounds

While the agent is working, the last turn card is dashed with a spinner and status
pills that follow the real stage — 正在思考 (thinking), 正在运行 · Ns (running a
tool, with elapsed time), 生成中… (generating a reply). Durations come from the
session snapshot and are never fabricated or ticked by a timer.

## Loading and empty states

- New session with no nodes → a guidance empty state, with the category bar still
  available.
- `加载更早记录` appears when older events exist; it disables while loading and
  windows the list further back.
- A session that failed to open shows an error bar instead of a blank pane.

## Uninstall

```sh
dsh plugin --profile web remove dsh-trail dsh-trail-bundle
```

The slot cell is released with the plugin and the original trajectory view returns
unchanged — `dsh-trail` only reads the session snapshot and writes nothing back.
