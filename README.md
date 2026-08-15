# dsh-trail

An out-of-tree plugin for the DeepSeek Harness Web GUI that replaces the
Trajectory tab with a **new-user-friendly storyline** view.

- Turn-grouped cards: what you asked → what the AI thought → what it did → the outcome
- Tool names rendered as plain-language Chinese labels with one-line notes; raw arguments collapse into a Details toggle
- Live status badge (thinking / running a tool / replying), never fabricates durations
- A search box to jump to a turn or tool; a legend and an empty-state guide
- Uninstalling restores the original trajectory view

> Status: prototype and local verification complete; not yet published to npm.
> Simplified Chinese only for v1; English localization comes with the release.

## Install

```sh
dsh plugin --profile web add dsh-trail dsh-trail-bundle
```

(After npm publication these names resolve from the registry; before that,
install from local paths: `dsh plugin --profile web add <plugin-dir> <bundle-dir>`.)

## Supported versions

- **dsh**: 0.1.0-rc.5 (the only release today; re-check the contracts below on upgrade)
- **react**: ^18 (provided by the dsh web shell's platform module table; this plugin does not bundle react)

Product contracts this plugin relies on (verify before upgrading dsh):

1. The `id: 'trajectory'` cell of the `conversation.view` slot and its standard props (`useSession` / `sessionId`)
2. Top-level session snapshot fields: `nodes`, `turnTimings`, `partial`, `runningCalls`, `hasMore`, `loadingOlder`, `openState` — these are product compatibility projections; the plugin must be upgraded if the product removes them
3. The `sessions.binding(id).session.loadOlder()` paging action
4. The `dsh.client` manifest and the `window.__ModuleLoader__` client-bundle contract

## Docs

- [docs/requirements.md](docs/requirements.md) — pain points, goals, functional requirements, acceptance criteria, risks (简体中文)
- [docs/design.md](docs/design.md) — UI structure, data mapping, node rendering rules, tool label table, package layout (简体中文)
- [docs/plan.md](docs/plan.md) — staged plan and verification checklist (简体中文)
- [docs/releasing.md](docs/releasing.md) — release checklist

## License

MIT
