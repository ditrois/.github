import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { shouldRun, inspect } from '../.github/actions/ci-scope/ci-scope.mjs';
test('only safe documentation changes skip on PRs and validated pushes', () => {
  assert.equal(shouldRun(['README.md','docs/guide.md']),false);
  assert.equal(shouldRun(['README.md'],{event:'push'}),false);
  for (const event of ['workflow_dispatch','pull_request_target','schedule']) assert.equal(shouldRun(['README.md'],{event}),true);
  for (const paths of [[],null,[null],['/docs/readme.md'],['docs/../app/x.md'],['src/a.ts'],['README.md','package-lock.json'],['resources/templates/message.md'],['LEAVE.md'],['docs/contract.json'],['.github/workflows/test.yml']]) assert.equal(shouldRun(paths),true);
});
test('pushes diff the complete before..after range, including multi-commit merges', () => {
  const payload={before:'a'.repeat(40),after:'b'.repeat(40)};
  for (const [paths, expected] of [['README.md\0docs/guide.md\0',false],['src/a.ts\0README.md\0',true]]) {
    const commands=[];
    assert.equal(inspect({eventName:'push',payload,git(...command){
      commands.push(command);
      return command[0]==='merge-base'?'':paths;
    }}),expected);
    assert.deepEqual(commands,[['merge-base','--is-ancestor',payload.before,payload.after],['diff','--name-only','--no-renames','-z',payload.before,payload.after]]);
  }
});
test('push ambiguity, force pushes and missing history always run full coverage', () => {
  const good={before:'a'.repeat(40),after:'b'.repeat(40)};
  for (const payload of [{}, {...good,before:'0'.repeat(40)}, {...good,after:'0'.repeat(40)}, {...good,before:'bad'}, {...good,forced:true}, {...good,deleted:true}]) {
    assert.equal(inspect({eventName:'push',payload,git(){throw new Error('must not skip');}}),true);
  }
  assert.equal(inspect({eventName:'push',payload:good,git(){throw new Error('missing ancestor');}}),true);
  assert.equal(inspect({eventName:'push',payload:good,git(){return '';}}),true);
  assert.equal(inspect({eventName:'workflow_dispatch',payload:good,git(){return 'README.md\0';}}),true);
});
test('push scoping preserves operational contracts, cross-app coverage and rename safety', () => {
  const payload={before:'a'.repeat(40),after:'b'.repeat(40)};
  const check=(paths,mode)=>inspect({eventName:'push',payload,mode,git(...args){return args[0]==='merge-base'?'':paths.join('\0')+'\0';}});
  assert.equal(check(['docs/recurring-issues/template.md'],'property'),true);
  assert.equal(check(['README.md','resources/templates/message.md'],'property'),true);
  assert.equal(check(['README.md','src/renamed.md'],'generic'),true);
  assert.equal(check(['worker/src/a.py'],'gumchord-web'),false);
  assert.equal(check(['web/src/a.ts'],'gumchord-worker'),false);
  for(const mode of ['gumchord-web','gumchord-worker']) assert.equal(check(['web/src/lib/queue.ts'],mode),true);
});
test('real git history keeps a code commit followed by docs in the pushed range', () => {
  const cwd=mkdtempSync(join(tmpdir(),'ditrois-ci-scope-'));
  const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  try {
    git('init');git('config','user.name','CI scope test');git('config','user.email','ci@example.invalid');
    const commit=(name,value)=>{writeFileSync(join(cwd,name),value);git('add','--',name);git('commit','-m','fixture');return git('rev-parse','HEAD').trim();};
    const before=commit('README.md','initial');
    const docs=commit('README.md','documentation');
    assert.equal(inspect({eventName:'push',payload:{before,after:docs},git}),false);
    commit('app.php','<?php echo 1;');
    const after=commit('README.md','more documentation');
    assert.equal(inspect({eventName:'push',payload:{before:docs,after},git}),true);
    git('mv','app.php','renamed.md');git('commit','-m','rename executable to markdown');
    assert.equal(inspect({eventName:'push',payload:{before:after,after:git('rev-parse','HEAD').trim()},git}),true);
    assert.equal(inspect({eventName:'push',payload:{before:after,after:before},git}),true);
  } finally {rmSync(cwd,{recursive:true,force:true});}
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
