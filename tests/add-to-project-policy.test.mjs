import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('retired issue reusable workflows cannot run or be called', () => {
  for (const name of ['add-to-project.yml', 'issue-intake.yml']) {
    assert.equal(existsSync(new URL('.github/workflows/' + name, root)), false, name);
  }
  for (const name of readdirSync(new URL('.github/workflows/', root))) {
    if (!/\.ya?ml$/.test(name)) continue;
    const source = readFileSync(new URL('.github/workflows/' + name, root), 'utf8');
    assert.doesNotMatch(source, /^  (issues|issue_comment):/m, name);
    assert.doesNotMatch(source, /uses: ditrois\/\.github\/\.github\/workflows\/(add-to-project|issue-intake)\.yml@/, name);
  }
});

test('web consumers retain readable canonical assignment and estimate policies', () => {
  const assignments = JSON.parse(readFileSync(new URL('.github/issue-assignment-rules.json', root)));
  const estimates = JSON.parse(readFileSync(new URL('.github/project-estimate-rules.json', root)));
  assert.equal(Object.keys(assignments).length, 6);
  assert.ok(assignments['ditrois/property'].assignee);
  assert.equal(assignments['ditrois/OpenSID-Issues'], undefined);
  assert.ok(estimates.some(rule => rule.estimate === 0.25));
  assert.ok(estimates.some(rule => rule.estimate === 0.5));
  assert.ok(estimates.every(rule => rule.repository.startsWith('ditrois/')));
});
