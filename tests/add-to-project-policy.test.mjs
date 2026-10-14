import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/add-to-project.yml', import.meta.url), 'utf8');
const caller = readFileSync(new URL('../templates/add-to-project-caller.yml', import.meta.url), 'utf8');
const rules = readFileSync(new URL('../.github/project-estimate-rules.json', import.meta.url), 'utf8');
const scripts = [...workflow.matchAll(/^          script: \|\n((?:^            .*\n|^\n)+)/gm)]
  .map(([, body]) => body.replace(/^            /gm, ''));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function execute(index, context, github) {
  const failures = [];
  await new AsyncFunction('context', 'github', 'core', 'process', 'Buffer', scripts[index])(
    context, github, { info() {}, setFailed(message) { failures.push(message); } },
    { env: { PROJECT_URL: 'https://github.com/orgs/ditrois/projects/4' } }, Buffer,
  );
  assert.deepEqual(failures, []);
}

test('caller and reusable job reject non-issue events before scheduling', () => {
  assert.match(caller, /types: \[opened, reopened, edited, labeled, assigned, transferred\]/);
  assert.doesNotMatch(caller, /pull_request|workflow_dispatch/);
  for (const source of [caller, workflow]) {
    assert.match(source, /if: \$\{\{ github.event_name == 'issues' \}\}/);
  }
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.doesNotMatch(workflow, /self-hosted|\.\.\. on PullRequest/);
  assert.equal(scripts.length, 2);
});

test('neither embedded script makes an API call for a PR', async () => {
  const github = new Proxy({}, { get() { throw new Error('Unexpected API call'); } });
  const issue = { node_id: 'pr', pull_request: {}, title: 'Proses gaji bulanan' };
  for (const eventName of ['pull_request', 'pull_request_target', 'issues']) {
    const context = { eventName, payload: { issue, repository: { full_name: 'ditrois/general' } } };
    for (let index = 0; index < scripts.length; index++) await execute(index, context, github);
  }
});

for (const existing of [true, false]) {
  test(`reopened issue ${existing ? 'restores an existing' : 'adds a missing'} item to Todo`, async () => {
    const calls = [];
    const github = { async graphql(query, variables) {
      calls.push({ query, variables });
      if (query.includes('query(')) return {
        organization: { projectV2: { id: 'project', field: { id: 'status', options: [{ id: 'todo', name: 'Todo' }] } } },
        node: { projectItems: { nodes: existing ? [{ id: 'item', project: { id: 'project' } }] : [] } },
      };
      if (query.includes('addProjectV2ItemById')) return { addProjectV2ItemById: { item: { id: 'item' } } };
      return {};
    } };
    await execute(0, { eventName: 'issues', payload: { issue: { node_id: 'issue', html_url: 'https://github.com/ditrois/general/issues/1' } } }, github);
    assert.equal(calls.length, existing ? 2 : 3);
    assert.deepEqual(calls.at(-1).variables, { projectId: 'project', itemId: 'item', fieldId: 'status', optionId: 'todo' });
  });
}

test('issue estimate preserves fractional values using the real rule set', async () => {
  const calls = [];
  const github = {
    rest: { repos: { async getContent() { return { data: { content: Buffer.from(rules).toString('base64') } }; } } },
    async graphql(query, variables) {
      calls.push({ query, variables });
      if (query.includes('query(')) return {
        organization: { projectV2: { id: 'project', field: { id: 'estimate' } } },
        node: { projectItems: { nodes: [{ id: 'item', project: { id: 'project' } }] } },
      };
      return {};
    },
  };
  await execute(1, {
    eventName: 'issues',
    payload: {
      issue: { node_id: 'issue', title: 'Cari dan tawarkan pilihan properti untuk buyer #144', labels: [], html_url: 'https://github.com/ditrois/property/issues/144' },
      repository: { full_name: 'ditrois/property' },
    },
  }, github);
  assert.equal(calls.at(-1).variables.estimate, 0.25);
});

test('unmatched issue does not invent an estimate', async () => {
  await execute(1, { eventName: 'issues', payload: {
    issue: { title: 'Unrelated work', labels: [] }, repository: { full_name: 'ditrois/general' },
  } }, {
    rest: { repos: { async getContent() { return { data: { content: Buffer.from(rules).toString('base64') } }; } } },
    async graphql() { throw new Error('Unexpected estimate mutation'); },
  });
});
