# Development

Build, test, publish and contribute to `dsh-trail`.

## Layout

```text
dsh-trail/
├── packages/
│   ├── trail/                  # npm package dsh-trail — the client plugin
│   │   ├── package.json        #   "dsh": { "client": { "platform": "web" } }
│   │   └── src/  tests/
│   └── bundle/                 # npm package dsh-trail-bundle — the patch layer
│       ├── package.json        #   "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
│       └── cordis.patch.yml    #   insert the plugin row; disable ui-trajectory
└── pnpm-workspace.yaml
```

The plugin renders purely from top-level session snapshot selectors; there is no
Host half. Internal working docs (requirements, design, plan, release checklist)
stay local and are excluded by `.gitignore`.

## Prerequisites

- Node.js and pnpm (the workspace pins a `packageManager` version)
- A `dsh` CLI on PATH for install smoke tests

## Commands

```sh
pnpm install     # install workspace dependencies
pnpm typecheck   # tsc --noEmit for the plugin package
pnpm build       # build lib/ (index + client bundle)
pnpm test        # vitest unit tests for grouping, mapping, summaries, search, filters
```

Run them from the repository root; the root scripts forward to the `dsh-trail`
package.

## Smoke test in an isolated profile

Before publishing, verify the two-package install end-to-end without touching your
real profile:

```sh
DSH_HOME=<temporary directory> dsh plugin --profile web add dsh-trail dsh-trail-bundle
DSH_HOME=<temporary directory> dsh web --dump-config   # dsh-trail row inserted, ui-trajectory disabled
DSH_HOME=<temporary directory> dsh web --port <port>   # server starts without errors
curl http://127.0.0.1:<port>/plugins/dsh-trail/client.js   # 200 + __ModuleLoader__ banner
```

## Publish

npm and GitHub are independent: the npm version exists the moment `pnpm publish`
lands on the registry, while the GitHub version is the pushed code plus a tag (and
an optional Release page). Prefer confirming the GitHub side first — published npm
versions are effectively immutable.

For a new version (e.g. 0.2.0):

1. Bump `version` in both `packages/trail/package.json` and
   `packages/bundle/package.json`; when the plugin changed, also sync the bundle's
   `dsh-trail` dependency range (e.g. `^0.2.0`). Commit and push
   (`chore(release): 0.2.0`).
2. Run the gates (`pnpm typecheck && pnpm build && pnpm test`) and the isolated
   smoke test above.
3. Publish from this workspace, plugin first:

```sh
pnpm --filter dsh-trail publish --no-git-checks
pnpm --filter dsh-trail-bundle publish --no-git-checks
```

Keep the bundle's `dsh-trail` dependency range in sync with the published plugin
version, and run the smoke test above in an isolated `DSH_HOME` after publishing.
With 2FA enabled, publish prompts for a one-time code in the interactive terminal.

4. Tag and optionally release on GitHub:

```sh
git tag v0.2.0 && git push origin v0.2.0
gh release create v0.2.0 --notes "..."   # optional Release page
```

## Contributing

- Keep `README.md` and `README.zh.md` in sync; shipped docs are English.
- Add or update vitest cases for grouping, mapping, summaries, search and filter
  logic — the view components are prop-driven pure functions.
- Do not commit internal working docs; they belong in `docs/` and are gitignored.
