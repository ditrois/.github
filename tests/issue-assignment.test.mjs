import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import policy from '../.github/scripts/issue-assignment.cjs';
const rules = JSON.parse(readFileSync(new URL('../.github/issue-assignment-rules.json', import.meta.url)));
const context = (repo = 'ditrois/property', issue = {}) => ({
  eventName: 'issues', repo: { owner: 'ditrois', repo: repo.split('/')[1] },
  payload: { action: 'opened', repository: { full_name: repo }, issue: { number: 1, labels: [], assignees: [], ...issue } },
});
test('exactly six existing assignment policies; no OpenSID or unknown assignment', () => {
  assert.equal(Object.keys(rules).length, 6);
  for (const [repo, expected] of Object.entries(rules)) assert.equal(policy.assignmentFor(context(repo), rules), expected.assignee);
  for (const repo of ['ditrois/OpenSID-Issues', 'ditrois/new', 'another/property']) assert.equal(policy.assignmentFor(context(repo), rules), null);
});
test('existing assignees, manager exception and Personal recurring exclusion survive', () => {
  assert.equal(policy.assignmentFor(context('ditrois/property', {assignees:[{login:'other'}]}), rules), null);
  for (const repo of Object.keys(rules)) assert.equal(policy.assignmentFor(context(repo, {labels:[{name:'Perlu Perhatian Manager'}]}), rules), null);
  assert.equal(policy.assignmentFor(context('ditrois/personal-jyo', {labels:['recurring']}), rules), null);
  assert.equal(policy.assignmentFor(context('ditrois/property', {labels:['recurring']}), rules), 'Madeersani');
});
test('nonissue, PR and reopened events do not assign', () => {
  for (const eventName of ['pull_request','pull_request_target','workflow_dispatch']) assert.equal(policy.assignmentFor({...context(), eventName}, rules), null);
  assert.equal(policy.assignmentFor(context('ditrois/property', {pull_request:{}}), rules), null);
  const reopened = context(); reopened.payload.action = 'reopened';
  assert.equal(policy.assignmentFor(reopened, rules), null);
});
test('live read protects assignments or labels added after event delivery', async () => {
  let writes = 0;
  for (const data of [{number:1,assignees:[{login:'human'}]}, {number:1,assignees:[],labels:[{name:'Perlu Perhatian Manager'}]}]) {
    await policy.assignIssue({context:context(), rules, core:{info(){}}, github:{rest:{issues:{
      async get(){return {data};}, async addAssignees(){writes++;}
    }}}});
  }
  assert.equal(writes,0);
});
test('unassigned issue uses its existing repository default', async () => {
  const writes=[];
  await policy.assignIssue({context:context(),rules,core:{info(){}},github:{rest:{issues:{
    async get(){return {data:{number:1,assignees:[],labels:[]}};},async addAssignees(args){writes.push(args);}
  }}}});
  assert.deepEqual(writes,[{owner:'ditrois',repo:'property',issue_number:1,assignees:['Madeersani']}]);
});
test('canonical assignment policy survives retirement of the Actions helpers', () => {
  for (const name of ['add-to-project.yml', 'issue-intake.yml']) {
    assert.equal(existsSync(new URL('../.github/workflows/' + name, import.meta.url)), false);
  }
  for (const rule of Object.values(rules)) {
    assert.equal(typeof rule.assignee, 'string');
    assert.ok(rule.assignee.length > 0);
    assert.ok(Array.isArray(rule.skip_labels));
  }
});
