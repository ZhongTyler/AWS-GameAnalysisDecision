import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {prepareSubagentTask, subagentType} from '../scripts/subagent-task.mjs';

const root = path.resolve(import.meta.dirname, '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const task = {
  subquestion: 'Which state and recovery checks apply to a covered disabled confirmation control?',
  stop_when: 'Return a conditional finding, one alternative and a bounded next check.',
  host_facts: [{state: 'disabled', reason_available: true, confirmation_icon_covered: true}],
};
let checks = 0;
assert.throws(() => prepareSubagentTask(null), /object/); checks++;
assert.throws(() => prepareSubagentTask({}), /subquestion/); checks++;
assert.throws(() => prepareSubagentTask({subquestion: 'x'}), /stop_when/); checks++;
assert.throws(() => prepareSubagentTask({...task, accepted: true}), /Unknown/); checks++;
assert.throws(() => prepareSubagentTask({...task, host_facts: {}}), /array/); checks++;
const empty = prepareSubagentTask(task);
assert.deepEqual(empty.professional.assets, []); checks++;
const normal = prepareSubagentTask({...task, selection: {problem: 'interaction-recovery'}});
assert.ok(normal.professional.assets.some(a => a.id === 'PRO-UX-001-state-input-feedback-recovery-audit'));
assert.ok(normal.professional.assets.every(a => a.use_status === 'normal')); checks++;
const excluded = prepareSubagentTask({...task, selection: {ids: ['expert-UX']}});
assert.deepEqual(excluded.professional.assets, []); checks++;
const opted = prepareSubagentTask({...task, selection: {ids: ['expert-UX', 'PRO-UX-001-state-input-feedback-recovery-audit'], includeCandidates: true}});
assert.deepEqual(opted.professional.assets.map(a => a.id), ['expert-UX', 'PRO-UX-001-state-input-feedback-recovery-audit']); checks++;
for (const asset of opted.professional.assets) {
  assert.equal(asset.sha256, hash(fs.readFileSync(path.join(root, asset.path))));
  assert.equal(asset.content, fs.readFileSync(path.join(root, asset.path), 'utf8'));
}
checks++;
assert.equal(opted.execution_status, 'prepared');
assert.equal(opted.runtime_identity, null);
assert.equal(opted.professional.sources_read, false);
assert.equal(opted.support_effect, 'unmeasured'); checks++;
const definition = fs.readFileSync(opted.agent_definition.path, 'utf8');
assert.match(definition, new RegExp(`^name = "${subagentType}"`, 'm'));
assert.match(definition, /^developer_instructions = """/m);
assert.equal(opted.agent_definition.sha256, hash(definition));
assert.equal(opted.codex_config_overrides[`agents.${subagentType}.config_file`], opted.agent_definition.path); checks++;
const partial = prepareSubagentTask({...task, selection: {problem: 'interaction-recovery', includeCandidates: true}, reading_budget: {maxAssets: 1, maxCharacters: 100}});
assert.equal(partial.professional.status, 'partial');
assert.ok(partial.professional.not_loaded.length > 0); checks++;
assert.throws(() => prepareSubagentTask({...task, selection: {ids: ['PRO-PM-002-automation-production-boundary-audit'], includeCandidates: true}}), /retired/); checks++;
assert.throws(() => prepareSubagentTask({...task, selection: {unrecognized: true}}), /Unknown/); checks++;

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gad-subagent-'));
try {
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'agents/catalogue.json'), 'utf8'));
  const snapshotPaths = ['agents/catalogue.json', 'agents/problem-routes.json', 'learning/state.json', `.codex/agents/${subagentType}.toml`, ...catalogue.assets.map(a => a.path)];
  for (const relative of snapshotPaths) {
    const destination = path.join(temporaryRoot, relative);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.copyFileSync(path.join(root, relative), destination);
  }
  const statePath = path.join(temporaryRoot, 'learning/state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  state.assets['PRO-UX-001-state-input-feedback-recovery-audit'] = {
    ...(state.assets['PRO-UX-001-state-input-feedback-recovery-audit'] ?? {}), eligibility: 'disabled',
  };
  fs.writeFileSync(statePath, JSON.stringify(state));
  const disabled = prepareSubagentTask({...task, selection: {ids: ['PRO-UX-001-state-input-feedback-recovery-audit'], includeCandidates: true}}, temporaryRoot);
  assert.deepEqual(disabled.professional.assets, []);
  assert.equal(disabled.professional.usage[0].status, 'disabled'); checks++;
  const requestPath = path.join(temporaryRoot, 'request.json');
  fs.writeFileSync(requestPath, JSON.stringify(task));
  const cliResult = JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts/subagent-task.mjs'), '--request', requestPath], {encoding: 'utf8'}));
  assert.equal(cliResult.schema, 'gad-subagent-task/v1');
  assert.equal(cliResult.subquestion, task.subquestion);
  assert.equal(cliResult.requested_agent_type, subagentType); checks++;
  const target = path.join(root, opted.professional.assets[0].path);
  const originalRead = fs.readFileSync;
  let targetReads = 0;
  try {
    fs.readFileSync = function(file, ...args) {
      const result = originalRead.call(this, file, ...args);
      if (typeof file === 'string' && path.resolve(file) === path.resolve(target) && ++targetReads > 1) {
        return typeof result === 'string' ? result + '\nchanged-during-read' : Buffer.concat([result, Buffer.from('\nchanged-during-read')]);
      }
      return result;
    };
    assert.throws(() => prepareSubagentTask({...task, selection: {ids: ['expert-UX'], includeCandidates: true}}), /changed during selection/); checks++;
  } finally {
    fs.readFileSync = originalRead;
  }
} finally {
  const resolved = fs.realpathSync(temporaryRoot);
  if (path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) || !path.basename(resolved).startsWith('gad-subagent-')) {
    throw new Error('Unexpected test fixture location');
  }
  fs.rmSync(resolved, {recursive: true, force: true});
}
console.log(`PASS: ${checks} subagent task checks, including CLI, state boundaries and content drift.`);
