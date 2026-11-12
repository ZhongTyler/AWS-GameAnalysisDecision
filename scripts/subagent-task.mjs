import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {selectProfessional} from './provider-v2.mjs';
import {containedPath, repositoryRoot} from './learning-cli.mjs';

export const subagentType = 'tw_gad_investigator';
const allowedFields = new Set(['subquestion', 'stop_when', 'selection', 'reading_budget', 'host_facts']);

export function prepareSubagentTask(task, root = repositoryRoot) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    throw new Error('Delegated task must be an object');
  }
  for (const key of Object.keys(task)) {
    if (!allowedFields.has(key)) throw new Error(`Unknown delegated-task field: ${key}`);
  }
  for (const key of ['subquestion', 'stop_when']) {
    if (typeof task[key] !== 'string' || !task[key].trim()) {
      throw new Error(`${key} must describe a concrete bounded task`);
    }
  }
  if (task.host_facts !== undefined && !Array.isArray(task.host_facts)) {
    throw new Error('host_facts must be an array');
  }
  const professional = selectProfessional(task.selection ?? {}, root, task.reading_budget ?? {});
  for (const asset of professional.assets) {
    const actualHash = crypto.createHash('sha256').update(asset.content).digest('hex');
    if (actualHash !== asset.sha256) throw new Error(`Professional content changed during selection: ${asset.id}`);
  }
  const configFile = containedPath(root, `.codex/agents/${subagentType}.toml`);
  const definition = fs.readFileSync(configFile, 'utf8');
  return {
    schema: 'gad-subagent-task/v1',
    execution_status: 'prepared',
    requested_agent_type: subagentType,
    runtime_identity: null,
    agent_definition: {
      path: configFile,
      sha256: crypto.createHash('sha256').update(definition).digest('hex'),
    },
    codex_config_overrides: {
      [`agents.${subagentType}.description`]: 'Investigate one bounded GAD subquestion',
      [`agents.${subagentType}.config_file`]: configFile,
    },
    subquestion: task.subquestion,
    host_facts: task.host_facts ?? [],
    stop_when: task.stop_when,
    professional,
    host_delivery: 'Return evidence and conditional findings to the original host; it owns decisions and acceptance.',
    support_effect: 'unmeasured',
  };
}

export function runSubagentTaskCli(args) {
  if (args.length !== 2 || args[0] !== '--request' || !args[1]) {
    throw new Error('Usage: subagent-task.mjs --request <task.json>');
  }
  const task = JSON.parse(fs.readFileSync(path.resolve(args[1]), 'utf8'));
  process.stdout.write(JSON.stringify(prepareSubagentTask(task), null, 2) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runSubagentTaskCli(process.argv.slice(2));
}
