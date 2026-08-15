# dsh-trail

一个 DeepSeek Harness Web 的 out-of-tree 插件：把「轨迹」页签替换为**新手友好**的故事线视图。

- 按回合分组的卡片：你问了什么 → AI 怎么想 → 做了什么 → 结果如何
- 工具名翻译成通俗中文 + 一句话说明，原始参数折叠进「详情」
- 实时状态徽标（正在思考 / 正在运行工具 / 正在回复），不虚构耗时
- 顶部搜索框定位某轮或某个工具；图例与空状态引导
- 卸载即恢复原轨迹视图

> 状态：原型与本机验证完成，npm 发布前。当前仅简体中文，发布版补英文。

## 安装

```sh
dsh plugin --profile web add dsh-trail dsh-trail-bundle
```

（npm 发布后可直接用包名；发布前可从本地路径安装：`dsh plugin --profile web add <插件包目录> <bundle 目录>`）

## 支持版本

- **dsh**：0.1.0-rc.5（当前唯一版本；新版本需复核下述契约）
- **react**：^18（由 dsh web 壳的平台模块表提供，本插件不打包 react）

依赖的产品契约（升级 dsh 前先核对）：

1. `conversation.view` slot 的 `id: 'trajectory'` 格子与标准 props（`useSession`/`sessionId`）
2. 顶层会话快照字段：`nodes` / `turnTimings` / `partial` / `runningCalls` / `hasMore` / `loadingOlder` / `openState`——这些是产品为兼容保留的投影字段，产品若移除本插件需同步升级
3. `sessions.binding(id).session.loadOlder()` 分页动作
4. `dsh.client` 清单 + `window.__ModuleLoader__` 客户端 bundle 契约

## 目录

- [docs/requirements.md](docs/requirements.md) — 痛点、目标/非目标、功能需求 FR-1…FR-11、验收标准 AC-1…AC-9、风险
- [docs/design.md](docs/design.md) — UI 结构、数据源映射、节点渲染规则、工具映射表、包结构
- [docs/plan.md](docs/plan.md) — 分阶段实施计划与验收清单
- [docs/releasing.md](docs/releasing.md) — 发布清单

## 许可

MIT
