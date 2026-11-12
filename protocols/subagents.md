# 按需独立子任务

当一个游戏问题存在可单独调查的证据缺口、竞争解释或反方审查，且预期收益值得协调成本时，主控可以在当前授权和预算内调用一个独立子Agent。先确定具体子问题、最小事实和停止条件，再准备载荷。普通分析直接使用现有方法。

## 准备实际内容

主控从已有上下文生成任务文件，复用当前选用规则决定selection和候选开关。示例使用合成界面事实。

```json
{
  "subquestion": "确认按钮禁用时仍覆盖原图标，玩家可能在哪一步误解状态？给替代解释和最小核对方法。",
  "stop_when": "给出与事实绑定的条件判断、反例和下一项检查后返回。",
  "selection": {"problem": "interaction-recovery"},
  "host_facts": [{"state": "disabled", "reason_available": true, "confirmation_icon_covered": true}]
}
```

从GAD根调用。

```text
node scripts/subagent-task.mjs --request task.json
```

该入口使用现有Provider读取正文、hash、使用状态、来源计划与not_loaded。默认阅读预算沿[选用协议](selection.md)，候选需要具体缺口和显式includeCandidates，停用及退役优先。没有加载专业正文时，主控根据问题判断能否直接建模，必要证据缺失交回查证。

产物为prepared任务，runtime_identity初始为null，support_effect为unmeasured。读取专家卡、来源已读、实际独立执行和有效分析分别核对。

## 调用当前宿主

预设维护源为[tw_gad_investigator.toml](../.codex/agents/tw_gad_investigator.toml)。模型、推理强度、权限、provider和MCP沿父会话与宿主合同。

1. 本地Codex已发现该角色且实际工具提供agent_type时，调用tw_gad_investigator，使用独立上下文，把任务包传入并等待结果。
2. 从其他目录进入或角色发现尚未生效时，可在现有模型调用授权内，使用任务包codex_config_overrides声明具名角色的新本地Codex会话。每项按结构化参数传入，避免拼接未转义命令。现有CLI支持agents.<name>.config_file，读取同一维护源。
3. 宿主仅支持通用子任务时，将同一角色职责及实际任务包显式传给独立执行者，记录执行方式为通用委派。宿主无法委派时，主控按原方法完成可做部分并说明独立复核缺口。

项目作用域配置的发现受信任与客户端版本影响，新增配置后以新会话的实际接口和运行记录为准。ChatGPT Work沿其宿主提供的委派入口读取任务方法。

## 返回和消费

子任务返回条件判断、具体证据、反例、未知和最小下一检查，并注明实际消费的专业内容ID与版本。主控复核关键证据，把本题影响合入原分析正文。正式决定、accepted、实现与真人认可由原宿主拥有。

核验实际调用的角色、独立上下文、完成状态和父子用量。执行身份由可信运行记录确认，requested_agent_type和自报角色保留其请求/陈述性质。完整任务载荷未取得时披露审计范围。

本入口用于按题支持，现有Skill和长期项目会话继续承担各自方法及职责。专业内容或运行表现出现反例时，沿原[学习协议](learning.md)收窄或修订，并保留原证据。

官方合同核对日期为2026-11-12。[子Agent配置](https://learn.chatgpt.com/docs/agent-configuration/subagents)、[具名角色配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)
