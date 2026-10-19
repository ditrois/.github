import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRun, inspect } from '../.github/actions/ci-scope/ci-scope.mjs';
test('only safe documentation PRs skip; pushes always validate merged code', () => {
  assert.equal(shouldRun(['README.md','docs/guide.md']),false);
  for (const event of ['push','workflow_dispatch','pull_request_target']) assert.equal(shouldRun(['README.md'],{event}),true);
  for (const paths of [[],null,['src/a.ts'],['README.md','package-lock.json'],['resources/templates/message.md'],['LEAVE.md'],['docs/contract.json'],['.github/workflows/test.yml']]) assert.equal(shouldRun(paths),true);
});
test('Property retirement audit contracts are test inputs, not skippable docs', () => {
  assert.equal(shouldRun(['docs/recurring-issues/retirement-validation.md'],{mode:'property'}),true);
});
test('Gumchord web and worker isolation fails open for shared changes', () => {
  assert.equal(shouldRun(['worker/src/a.py'],{mode:'gumchord-web'}),false);
  assert.equal(shouldRun(['web/src/a.ts'],{mode:'gumchord-worker'}),false);
  for (const mode of ['gumchord-web','gumchord-worker']) {
    for(const p of ['shared/schema.json','.github/workflows/web.yml','package.json','other/new.txt','web/db/migrations/001.sql','web/src/lib/queue.ts','worker/gumchord/schema.py']) assert.equal(shouldRun([p],{mode}),true);
  }
});
test('missing history, invalid events, unknown scope, empty diffs all run full tests', () => {
  assert.equal(shouldRun(['README.md'],{mode:'unknown'}),true);
  assert.equal(inspect({eventName:'pull_request',payload:{}}),true);
  const payload={pull_request:{base:{sha:'a'.repeat(40)},head:{sha:'b'.repeat(40)}}};
  assert.equal(inspect({eventName:'pull_request',payload,git(){throw new Error('no history');}}),true);
  const args=[];
  assert.equal(inspect({eventName:'pull_request',payload,git(...command){
    args.push(command); return command[0]==='merge-base'?'c'.repeat(40):'README.md\0'; }}),false);
  assert.ok(args[1].includes('--no-renames'));
});
