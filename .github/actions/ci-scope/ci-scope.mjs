import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function shouldRun(files, { event = 'pull_request', mode = 'generic' } = {}) {
  if (!['pull_request', 'push'].includes(event) || !Array.isArray(files) || files.length === 0) return true;
  if (files.some(path => typeof path !== 'string' || !path || path.startsWith('/') || path.split('/').includes('..'))) return true;
  if (!['generic', 'property', 'gumchord-web', 'gumchord-worker'].includes(mode)) return true;
  const documentation = path =>
    /^(README|CHANGELOG|AGENTS)\.md$/i.test(path)
    || (/^docs\/.*\.md$/i.test(path)
      && !(mode === 'property' && path.startsWith('docs/recurring-issues/')));
  const relevant = files.filter(path => !documentation(path));
  if (relevant.length === 0) return false;
  // Cross-language data/queue contracts are consumed by both applications.
  const sharedContracts = [
    'web/db/', 'web/src/lib/songTimeline', 'web/src/lib/queue',
    'web/src/lib/dataDir', 'worker/gumchord/schema.py', 'worker/gumchord/consumer.py',
  ];
  if (mode.startsWith('gumchord-') && relevant.some(path => sharedContracts.some(prefix => path.startsWith(prefix)))) return true;
  if (mode === 'gumchord-web') return relevant.some(path => !path.startsWith('worker/'));
  if (mode === 'gumchord-worker') return relevant.some(path => !path.startsWith('web/'));
  return true;
}

export function inspect({ eventName, payload, mode, git = (...args) => execFileSync('git', args, { encoding: 'utf8' }) }) {
  if (!['pull_request', 'push'].includes(eventName)) return true;
  const push = eventName === 'push';
  // Never infer safety from a force push, new/deleted branch or partial history.
  if (push && (payload?.forced || payload?.deleted)) return true;
  const base = push ? payload?.before : payload?.pull_request?.base?.sha;
  const head = push ? payload?.after : payload?.pull_request?.head?.sha;
  const validSha = sha => typeof sha === 'string' && /^[a-f0-9]{40}$/.test(sha) && !/^0+$/.test(sha);
  if (![base, head].every(validSha)) return true;
  try {
    let ancestor = base;
    if (push) {
      // Use the whole pushed range, not HEAD^ or the (possibly truncated) event
      // commit list. A code commit followed by a docs commit must run tests.
      git('merge-base', '--is-ancestor', base, head);
    } else {
      ancestor = git('merge-base', base, head).trim();
      if (!validSha(ancestor)) return true;
    }
    // No rename detection: both deleted and added paths must participate.
    const paths = git('diff', '--name-only', '--no-renames', '-z', ancestor, head)
      .split('\0').filter(Boolean);
    return shouldRun(paths, { event: eventName, mode });
  } catch {
    return true; // Missing history, fork objects or any ambiguity: full coverage.
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let run = true;
  try {
    run = inspect({
      eventName: process.env.GITHUB_EVENT_NAME,
      payload: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
      mode: process.env.CI_SCOPE_MODE,
    });
  } catch { /* Fail open to full testing. */ }
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required.');
  appendFileSync(process.env.GITHUB_OUTPUT, 'run=' + run + '\n');
  console.log(run ? 'Full tests required.' : 'Only confidently irrelevant changes; CI gate remains active.');
}
