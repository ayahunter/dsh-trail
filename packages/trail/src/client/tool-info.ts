/** Tool-name → friendly Chinese label table. */

/** Friendly label pair: short name plus one-sentence explanation. */
export type ToolLabel = readonly [name: string, note: string]

/** Built-in mapping covering the current harness tool set. */
export const TOOL_INFO: Readonly<Record<string, ToolLabel>> = {
  read: ['读取文件', '查看文件内容'],
  write: ['写入文件', '创建或整体覆盖文件'],
  edit: ['编辑文件', '对文件做精确修改'],
  glob: ['查找文件', '按文件名模式搜索文件'],
  grep: ['搜索内容', '在文件内容里搜索'],
  bash: ['执行命令', '在终端执行一条命令'],
  pwsh: ['执行命令', '在 PowerShell 终端执行命令'],
  web_search: ['联网搜索', '搜索网上最新信息'],
  web_fetch: ['抓取网页', '打开并读取一个网页'],
  skill: ['加载技能', '读取一项任务技能说明'],
  todo_write: ['更新任务清单', '维护当前任务进度列表'],
  ask_user_question: ['向你提问', '需要你确认或选择'],
  read_image: ['查看图片', '读取一张图片'],
  subagent: ['派发子任务', '交给独立子代理执行'],
  subagent_fork: ['派发子任务', '交给继承上下文的子代理执行'],
  list_agents: ['查看子代理', '列出后台子代理'],
  send_message: ['联系子代理', '给子代理追加消息'],
  interrupt_agent: ['打断子代理', '取消子代理当前工作'],
  workflow: ['编排多代理', '并行拆解大规模任务'],
  create_goal: ['建立目标', '维护当前长期目标'],
  get_goal: ['查看目标', '读取当前长期目标'],
  update_goal: ['更新目标', '更新当前长期目标'],
  ralph: ['多轮迭代', '以全新子代理多轮推进目标'],
  exit_plan_mode: ['提交计划', '提交计划供你审阅'],
  job_list: ['后台任务', '列出后台任务'],
  job_output: ['后台任务', '读取后台任务输出'],
  job_kill: ['后台任务', '停止后台任务'],
  cordis_define: ['插件管理', '定义动态插件'],
  cordis_run: ['插件管理', '运行动态插件'],
  cordis_stop: ['插件管理', '停止动态插件'],
  cordis_undefine: ['插件管理', '删除动态插件'],
  cordis_inspect_list: ['插件管理', '查询运行接口'],
  cordis_inspect_query: ['插件管理', '查询运行接口'],
  cordis_inspect_self: ['插件管理', '查看插件状态'],
}

/** @param name - wire tool name. @returns friendly pair, or a fallback. */
export function toolLabel(name: string | undefined): ToolLabel {
  const info = name === undefined ? undefined : TOOL_INFO[name]
  return info === undefined ? [`调用工具 ${String(name)}`, ''] : info
}
