# 实施计划与验收清单

> 与 [requirements.md](requirements.md)、[design.md](design.md) 配套；每步附验证方式。
> 依赖决策已定：替换轨迹页签（用户拍板）、原高级功能折叠进详情+保留搜索（用户拍板）、开源独立仓库（用户拍板）。

## 阶段 0 规划（已完成）

- [x] 需求文档 / 设计文档 / 实施计划落盘 → verify: 本目录三份文件齐全
- [x] 仓库形态定案：独立开源 out-of-tree bundle（插件包 + bundle 包双包 workspace）
- [x] 仓库位置与命名：`D:\agentwork\code\dsh-trail`（git init 待用户确认）

## 阶段 1 动态原型（本会话，先于正式实现）

1.1 `cordis_define` 客户端插件（`conversation.view` id `trajectory`，纯快照数据，无 Host 半身）→ verify: 返回 pluginId/packageId
1.2 `cordis_run` → verify: Run 卡成功；`Slots.listSubTree root=conversation.view` 占用者变成本插件
1.3 真机点检 AC-1…AC-9 → verify: 逐条记录证据（含运行中回合、空状态、分页）
1.4 按用户反馈修订（新 Package + `update`）→ verify: 用户确认

## 阶段 2 开源仓库实现

2.1 仓库骨架：pnpm workspace、双包 package.json、README、LICENSE(MIT) → verify: `pnpm install` 通过
2.2 插件包 TS 实现（从原型移植；`dsh.client` manifest、`./client` 导出、tsdown bundle）→ verify: `pnpm build` 产出 `lib/client.js`
2.3 bundle 包：`cordis.patch.yml`（insert 本插件 dsh.client 行 + `disabled: true` ui-trajectory）→ verify: patch 结构与产品 bundle 约定一致
2.4 端到端冒烟：`dsh plugin --profile <测试名> add` + `dsh --profile <测试名> web` → verify: 轨迹页签为新视图、无控制台报错、移除后原视图恢复（R5 在此验证）
2.5 组件测试：分组、映射、折叠、搜索过滤（纯 props 驱动）→ verify: `pnpm test` 绿色

## 阶段 3 开源发布

3.1 git init 与远程仓库 → verify: 用户确认仓库地址（AGENTS.md 要求 init 前征询）
3.2 英文 README、LICENSE、版本号、支持矩阵（dsh 版本范围）→ verify: 文档齐全
3.3 npm 发布（包名/scope 征询用户）→ verify: 干净环境 `npm install` 可用
3.4 GitHub CI + 安装录屏 GIF → verify: 社区可照 README 安装

## 验收清单（交付前逐条核对）

- [ ] AC-1 空状态引导
- [ ] AC-2 回合卡片（问题/回复/耗时）
- [ ] AC-3 进行中徽标随阶段变化
- [ ] AC-4 长文本截断+展开
- [ ] AC-5 工具中文名+详情原始参数
- [ ] AC-6 搜索过滤+清空恢复
- [ ] AC-7 加载更早+禁用态
- [ ] AC-8 卸载恢复原视图
- [ ] AC-9 错误回合友好呈现
