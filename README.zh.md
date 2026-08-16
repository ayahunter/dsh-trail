# dsh-trail

> 一个 DeepSeek Harness Web 的 out-of-tree 插件：把「轨迹」页签替换为**新手友好**的故事线视图——原始事件表变成人人都能看懂的故事线。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![截图](docs/screenshot.png)

*更多截图：[回合视图](docs/screenshots/rounds-view.png) · [工具详情](docs/screenshots/tool-details.png)*

## 为什么做这个插件（痛点）

原版轨迹视图是为专家设计的工具，新手使用时有五个痛点：

1. **术语不翻译、无解释**——Duration、Turns、Calls、TTFT、compaction 等术语原样呈现，全界面没有图例。
2. **功能面过宽**——工具栏 5 个控件 + 可缩放/拖选的时间轴 + 独立检查器，认知负担大。
3. **没有故事线**——「索引/事件/内容」三列表按事件罗列，回答不了"我问了什么 → AI 怎么想 → 做了什么 → 结果如何"。
4. **中间过程是噪声**——思考内容、工具原始参数与回复正文同级并列，没有视觉层级。
5. **无引导**——没有图例、没有说明文案、没有空状态教学。

dsh-trail 用以下设计逐一解决。

## 功能

- **回合卡片**——每轮问答一张可折叠卡片：你问了什么 → AI 怎么想 → 调用了哪些工具 → 结果如何。
- **工具名通俗中文化**——`read` 显示为「读取文件」+ 一句话说明；未知工具优雅回退。
- **参数内联预览**——行内直接显示被操作的文件/命令，完整原始参数折叠进「详情」。
- **类别筛选**——「全部」+ 八个类别按钮，选择跨会话记忆。
- **模糊搜索**——忽略大小写、标点与全角形式，支持有序子序列匹配。
- **进行中回合**——虚线卡片 + 状态胶囊（正在思考 / 生成中… / 正在运行 · Ns）+ 旋转动画；耗时从不虚构。
- **零产品耦合**——只读会话快照顶层字段；卸载即恢复原视图。

## 安装

```sh
dsh plugin --profile web add dsh-trail dsh-trail-bundle
```

bundle 会禁用原 `ui-trajectory` 行并在其位置挂载本视图，因此页签栏**只有一个「轨迹」**。

## 支持版本

| 依赖 | 版本 |
|---|---|
| dsh | 0.1.0-rc.5（升级前需复核下述契约） |
| react | ^18（由 dsh web 壳提供） |

本插件依赖的产品契约：`conversation.view` 中 `id: 'trajectory'` 的格子与标准 props；顶层快照字段 `nodes` / `turnTimings` / `partial` / `runningCalls` / `hasMore` / `loadingOlder` / `openState`（兼容投影，产品若移除需同步升级本插件）；`sessions.binding(id).session.loadOlder()`；`dsh.client` 清单与 `window.__ModuleLoader__` 客户端 bundle 契约。

## 文档

- [docs/requirements.md](docs/requirements.md) — 痛点、目标/非目标、功能需求 FR-1…FR-11、验收标准 AC-1…AC-9、风险
- [docs/design.md](docs/design.md) — UI 结构、数据源映射、节点渲染规则、工具映射表、包结构
- [docs/plan.md](docs/plan.md) — 分阶段实施计划与验收清单
- [docs/releasing.md](docs/releasing.md) — 发布清单

## 状态

Beta：v4 已通过人工视觉验收；npm 发布进行中。

## 许可

[MIT](LICENSE)
