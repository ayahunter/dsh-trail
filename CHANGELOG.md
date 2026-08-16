# Changelog

本项目的变更日志。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [0.1.1] - 2026-08-16

### Changed

- README 双语按社区规范重写（痛点章节、效果图）并新增公开 usage/development 文档；
  内部工作文档（需求/设计/计划/发布清单）移出版本库，仅本地保留。
- 补充更新说明：`dsh plugin --profile web update` 用法，及 pnpm registry 元数据
  缓存与 `minimumReleaseAge` 24 小时供应链策略对"发布后短期升级"的影响与对策。

## [0.1.0] - 2026-08-16

### Added

- `dsh-trail` 插件：把 Web 内置「轨迹」页签替换为故事线视图（回合卡片、中文工具名、
  内联参数预览、分类筛选、模糊搜索、进行中状态）。
- `dsh-trail-bundle` patch 包：插入插件行并禁用内置 `ui-trajectory` 行。
