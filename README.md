# dsh-trail

> A new-user-friendly trajectory view for the DeepSeek Harness Web GUI: the
> raw event ledger becomes a storyline anyone can read.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![Screenshot](docs/screenshot.png)

*More screenshots: [rounds view](docs/screenshots/rounds-view.png) ·
[tool details](docs/screenshots/tool-details.png)*

## Why

The built-in trajectory view is a power tool. For a new user it hurts in
exactly five ways:

1. **Untranslated jargon** — `Duration`, `Turns`, `Calls`, TTFT, compaction,
   with no legend anywhere.
2. **Too many controls** — five toolbar toggles plus a zoomable/draggable
   timeline and a separate inspector.
3. **No storyline** — an index/event/content table lists events; it never
   answers "what did I ask → what did the AI do → what came back".
4. **Noise without hierarchy** — reasoning text, raw tool arguments and
   replies sit on the same visual level.
5. **No guidance** — no legend, no explanation, no empty-state teaching.

dsh-trail replaces the trajectory tab with a design that resolves all five.

## Features

- **Turn cards** — one collapsible card per round: what you asked → what the
  AI thought → which tools it called → the outcome.
- **Plain-language tool labels** — `read` becomes *读取文件 (read a file)*
  with a one-line note; unknown tools fall back gracefully.
- **Inline argument previews** — the touched file or command is visible on
  the row; full raw arguments fold into a Details toggle.
- **Category filter** — 全部 (all) plus eight row categories, remembered
  across sessions.
- **Fuzzy search** — ignores case, punctuation and full-width forms; terms
  match as ordered subsequences.
- **Live round** — dashed card with status pills (thinking / generating /
  running tool · elapsed) and a spinner; durations are never fabricated.
- **Zero product coupling** — reads only top-level session snapshot fields;
  uninstalling restores the original view.

## Install

```sh
dsh plugin --profile web add dsh-trail dsh-trail-bundle
```

The bundle disables the shipped `ui-trajectory` row and mounts this view in
its place, so exactly one 轨迹 tab remains.

## Supported versions

| Dependency | Version |
|---|---|
| dsh | 0.1.0-rc.5 (verify the contracts below on upgrade) |
| react | ^18 (provided by the dsh web shell) |

Product contracts this plugin relies on: the `conversation.view` slot cell
`id: 'trajectory'` and its standard props; the top-level snapshot fields
`nodes` / `turnTimings` / `partial` / `runningCalls` / `hasMore` /
`loadingOlder` / `openState` (compatibility projections — the plugin must be
upgraded if the product removes them); `sessions.binding(id).session.loadOlder()`;
the `dsh.client` manifest and the `window.__ModuleLoader__` client-bundle
contract.

## Docs

- [docs/requirements.md](docs/requirements.md) — pain points, goals, functional
  requirements, acceptance criteria, risks (简体中文)
- [docs/design.md](docs/design.md) — UI structure, data mapping, render rules,
  tool label table, package layout (简体中文)
- [docs/plan.md](docs/plan.md) — staged plan and verification checklist (简体中文)
- [docs/releasing.md](docs/releasing.md) — release checklist

## Status

Beta: v4 passed manual visual acceptance; npm publication in progress.

## License

[MIT](LICENSE)
