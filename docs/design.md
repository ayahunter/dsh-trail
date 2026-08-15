# 轨迹友好视图 — 设计文档

> 配套：[requirements.md](requirements.md)（痛点/FR/AC）。本文是 UI 与数据映射的单一真源。
> 状态：草案 v0.1

## 1. 视图位置与替换机制

- 页签：`conversation.view` 列表环中 `id: 'trajectory'` 的格子。注册同 id 即替换原占用者（slot 目录明文支持：复用已用 id 就是进入该格子并替换它）。
- 数据独立性：**不读取** `views.get('trajectory')`（那依赖 ui-trajectory 的 builder）。全部数据来自会话快照顶层字段，因此 bundle 可安全 `disabled: true` 掉 `ui-trajectory` 行，无双重占用、无顺序依赖。
- 插件卸载 → slot 占用随 fiber 移除 → 原轨迹视图恢复（FR-11）。

## 2. 页面结构（自上而下）

```
┌─ 视图 ─────────────────────────────────────────────┐
│ [搜索轨迹…]                               [隐藏图例 ▾]│  ← 顶栏
│ 图例：👤 你（用户） · 》 向AI回复 · 🧠 AI思考 · 🔧 工具 │
│       ✓ 成功结果 · ✗ 错误结果 · ℹ️ 系统事件            │
├────────────────────────────────────────────────────┤
│ ┌─ 第 1 轮 · 你问：给项目加个 README  8s · gpt-4o · 3.2k token ┐ │
│ │  👤 你：给项目加个 README                                     │ │
│ │  🧠 AI 思考：用户希望为项目添加…（60 字截断）      [展开]        │ │
│ │  🔧 读取文件 docs/design.md：查看项目设计文档…     [详情]        │ │
│ │  ✓ 读取文件 完成：docs/design.md · 预览第一行：# 项目设计文档     │ │
│ │  》 AI 回复：好的，我来为这个项目创建…（300 截断） [展开]        │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌─ 🔄 正在进行的回合 · 正在运行 ──────── [正在思考] ┐              │
│ │  🧠 AI 思考：…  ·  🔧 读取文件 package.json：…     │              │
│ │  🔧 读取文件 运行中 · 已运行 8s  ·  》 正在回复：…  │              │
│ └─────────────────────────────────────────────────┘            │
│            [加载更早记录]  /  空状态：还没有轨迹。给 AI 发一条消息…│
└────────────────────────────────────────────────────────────────┘
```

## 3. 数据源映射（会话快照顶层字段）

| UI 块 | 数据源（`useSession` 选择器） | 备注 |
|---|---|---|
| 节点列表 | `s => s.nodes`（`ConversationNode[]`） | 已按 seq 排序 |
| 回合耗时 | `s => s.turnTimings`（`Map<turn, {startTime, endTime?}>`） | endTime 缺失则不显示耗时 |
| 进行中回复 | `s => s.partial`（`PartialAssistant \| null`） | 流式更新 |
| 进行中工具 | `s => s.runningCalls`（`RunningToolCall[]`） | 不虚构耗时 |
| 会话运行态 | `s => s.running` | 控制徽标 |
| 分页 | `s => s.hasMore`、`s => s.loadingOlder` | 按钮态 |
| 加载态 | `s => s.openState` | `'loading'` 显示加载行 |
| 加载更早动作 | `inject: sessionId => ctx.sessions.binding(sessionId)?.session.loadOlder()` | 与 ui-trajectory 同款（已验证存在） |

每个字段一个独立 `useSession` 调用（选择器必须返回稳定引用，不能现组对象）。

## 4. 节点类型 → 渲染规则

| `kind` | 渲染（v2） | 折叠策略 |
|---|---|---|
| `user` | 👤 你：文本（content 的 text 块拼接） | >200 字截断+展开 |
| `assistant` | 步骤行；`blocks` 分类：`text`→「》 AI 回复：…」、`reasoning`→「🧠 AI 思考：…」、`tool-call`→「🔧 中文名 <参数预览>：说明」、`image`→🖼图片、`other`→系统事件；meta：`provenance.model`、`usage`、`interrupted`→「已停止」 | 思考默认折叠（60 字）；回复长文本截断（300 字） |
| `tool-result` | 「✓ 中文名 完成：<参数预览> · 预览第一行：<首行>」；`isError`→「✗ 中文名 出错：<错误>」；耗时 `time - callTime` | 完整结果进「详情」 |
| `context` / `compaction` / `turn-max-tokens` / `model-retry` | ℹ️ 系统事件：一句话说明（压缩行附条数/token，摘要可展开） | summary 进「详情」 |
| `steering` | 👤 你补充说：文本 | 同上截断 |
| `turn-error` | ✗ 本轮出错：`message`（`code` 附后） | — |
| `unknown` | ℹ️ 系统事件：其他（kind） | — |

参数预览：`argsRaw` 解析后按工具优先键提取（file_path/pattern/command/query…，见 model.ts `ARG_KEYS`），缺失回退首个字符串值或原文，60 字截断。

回合号：`assistant`/`turn-error`/`turn-max-tokens` 节点携带 `turn`；其余节点跟随当前回合号（无 turn 时沿用上一个，`user` 节点开新回合）。

## 5. 工具映射表（v1，覆盖当前会话工具集）

| 工具 | 中文名 | 一句话说明 |
|---|---|---|
| read | 读取文件 | 查看文件内容 |
| write | 写入文件 | 创建或整体覆盖文件 |
| edit | 编辑文件 | 对文件做精确修改 |
| glob | 查找文件 | 按文件名模式搜索文件 |
| grep | 搜索内容 | 在文件内容里搜索 |
| bash / pwsh | 执行命令 | 在终端执行一条命令 |
| web_search | 联网搜索 | 搜索网上最新信息 |
| web_fetch | 抓取网页 | 打开并读取一个网页 |
| skill | 加载技能 | 读取一项任务技能说明 |
| todo_write | 更新任务清单 | 维护当前任务进度列表 |
| ask_user_question | 向你提问 | 需要你确认或选择 |
| read_image | 查看图片 | 读取一张图片 |
| subagent / subagent_fork | 派发子任务 | 交给独立子代理执行 |
| list_agents | 查看子代理 | 列出后台子代理 |
| send_message | 联系子代理 | 给子代理追加消息 |
| interrupt_agent | 打断子代理 | 取消子代理当前工作 |
| workflow | 编排多代理 | 并行拆解大规模任务 |
| create_goal / get_goal / update_goal | 管理目标 | 维护当前长期目标 |
| ralph | 多轮迭代 | 以全新子代理多轮推进目标 |
| exit_plan_mode | 提交计划 | 提交计划供你审阅 |
| job_list / job_output / job_kill | 后台任务 | 查看/读取/停止后台任务 |
| cordis_define / cordis_run / cordis_stop / cordis_undefine / cordis_inspect_* | 插件管理 | 定义、运行、停用或检查自身插件 |

未知名回退：`调用工具 <name>`。映射表放在常量模块，后续工具集变化时只改一处。

## 6. 交互与折叠策略

- 展开状态用组件本地 `Set`（键 `n<seq>` / `b<seq>_<i>`）；切换不改快照、不写全局。
- 「详情」抽屉式行内展开（同一行下方展开原始参数/结果/计时/token），不用弹窗。
- 搜索：全小写子串匹配，命中「回合内任一文本」（用户问题、回复、思考、工具名、工具结果预览）；无命中显示「没有找到相关内容」。不做高亮索引、不做正则。
- 图例条默认展开（新用户），右上角「隐藏图例/图例」切换；七项：你（用户）/ 向 AI 回复 / AI 思考 / 工具调用 / 成功结果 / 错误结果 / 系统事件。
- 进行中回合为虚线卡片：标题「🔄 正在进行的回合 · 正在运行」+ 徽标（正在思考 / 生成中… / 正在运行工具 · Ns），工具行显示「已运行 Ns」；耗时随流式帧自然刷新，不额外起定时器、不虚构耗时。

## 7. 边界情况

- `nodes` 为空 + `partial` 为 null + 无 runningCalls → 空状态引导。
- `openState === 'loading'` → 顶部加载行；`'error'` → 错误提示条。
- 回合无 `endTime`（进行中或中断）→ 显示「进行中」或「已停止」，不显示耗时。
- 工具结果找不到配对的 call 头（`call === null`）→ 显示「工具调用 <callId> 的结果」。
- 部分节点字段缺失（usage/provenance/timing 可选）→ 对应 meta 不渲染，不兜底造假。
- 跨窗口分页后节点拼接：`loadOlder` 返回后快照自动更新，不手工合并。

## 8. 样式策略

- 组件私有 CSS（动态原型用 `styles.insert`；开源包用 CSS Modules），只作用于本视图根节点，前缀 `tf-`。
- 颜色一律用主题兼容写法（`currentColor` + `color-mix` 透明度变体，原型阶段不依赖具体 token 名）；不覆盖全局主题、不写死颜色。
- 图标用 emoji + 内联 SVG；开源包若引入 `@deepseek-ai/dsh-client-ui-primitives` 需评估版本耦合，v1 优先自绘。

## 9. 仓库与包结构

```
dsh-trail/                          # 开源仓库（git，发布前初始化；本地 D:\agentwork\code\dsh-trail）
├── README.md  LICENSE(MIT)  docs/…
├── packages/
│   ├── trail/                      # npm 包 dsh-trail（客户端插件）
│   │   ├── package.json            #   "dsh": { "client": { "platform": "web", "inject": [...] } }
│   │   │                           #   exports: "./client" -> lib/client.js；peerDeps: @deepseek-ai/*
│   │   └── src/  tests/
│   └── bundle/                     # npm 包 dsh-trail-bundle
│       ├── package.json            #   "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
│       │                           #   dependencies: 上面插件包（bundle 必须声明被注入包）
│       └── cordis.patch.yml        #   insert 本插件 dsh.client 行 + 同名 id 行 disabled: ui-trajectory
└── pnpm-workspace.yaml
```

安装（社区）：`dsh plugin --profile <name> add dsh-trail-bundle`。
