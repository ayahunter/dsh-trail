# 发布清单

npm 与 GitHub 发布前的固定步骤，按序执行。

## 1. 门禁

```sh
pnpm install
pnpm typecheck
pnpm build
pnpm test
```

## 2. 打包预检

```sh
cd packages/trail && pnpm pack --dry-run
cd ../bundle && pnpm pack --dry-run
```

确认 `dsh-trail` 包内包含 `lib/client.js`、`lib/index.js`、`lib/index.d.ts` 与 `package.json`（含 `dsh.client` 清单）；`dsh-trail-bundle` 包内包含 `cordis.patch.yml` 与 `package.json`（含 `dsh.bundle` 清单与 `dsh-trail` 依赖）。

## 3. npm 发布（先插件包，后 bundle 包）

```sh
pnpm --filter dsh-trail publish
pnpm --filter dsh-trail-bundle publish
```

发布前与仓库所有者确认：npm 包名是否加 scope（当前未加）、版本号（当前 0.1.0）、以及 bundle 依赖版本范围与发布版本一致。

## 4. 发布后安装验证

在隔离 DSH_HOME 下用包名安装（本仓库阶段 2.4 的同款冒烟）：

```sh
DSH_HOME=<临时目录> dsh plugin --profile web add dsh-trail dsh-trail-bundle
DSH_HOME=<临时目录> dsh web --dump-config   # 确认 dsh-trail 行插入、ui-trajectory 禁用
DSH_HOME=<临时目录> dsh web --port <端口>     # 确认启动无报错
curl http://127.0.0.1:<端口>/plugins/dsh-trail/client.js  # 期望 200 + __ModuleLoader__ banner
```

## 5. GitHub 发布

- 打 tag（`v0.1.0`）并附发布说明：新增内容、支持版本矩阵、已知限制（legacy 快照字段依赖）。
- 英文 README 与中文 README.zh.md 保持同步。
