# dsh-trail

一个 DeepSeek Harness Web 的 out-of-tree 插件：把「轨迹」页签替换为**新手友好**的故事线视图。

- 按回合分组的卡片：你问了什么 → AI 怎么想 → 做了什么 → 结果如何
- 工具名翻译成通俗中文 + 一句话说明，原始参数折叠进「详情」
- 实时状态徽标（正在思考 / 正在运行工具 / 正在回复），不虚构耗时
- 顶部搜索框定位某轮或某个工具；图例与空状态引导
- 卸载即恢复原轨迹视图

> 状态：规划完成，原型开发中。当前仅简体中文，发布版补英文。

## 目录

- [docs/requirements.md](docs/requirements.md) — 痛点、目标/非目标、功能需求 FR-1…FR-11、验收标准 AC-1…AC-9、风险
- [docs/design.md](docs/design.md) — UI 结构、数据源映射、节点渲染规则、工具映射表、包结构
- [docs/plan.md](docs/plan.md) — 分阶段实施计划与验收清单

## 快速开始（发布后）

```sh
dsh plugin --profile <你的 profile 名> add dsh-trail-bundle
```

## 许可

MIT（随仓库初始化时落盘 LICENSE 文件）。
