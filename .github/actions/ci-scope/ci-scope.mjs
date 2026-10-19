import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function shouldRun(files, { event = 'pull_request', mode = 'generic' } = {}) {
  if (event !== 'pull_request' || !Array.isArray(files) || files.length === 0) return true;
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
  if (eventName !== 'pull_request') return true;
  const base = payload?.pull_request?.base?.sha;
  const head = payload?.pull_request?.head?.sha;
  if (![base, head].every(sha => typeof sha === 'string' && /^[a-f0-9]{40}$/.test(sha))) return true;
  try {
    const ancestor = git('merge-base', base, head).trim();
    if (!/^[a-f0-9]{40}$/.test(ancestor)) return true;
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
  console.log(run ? 'Full tests required.' : 'Only confidently irrelevant PR changes; CI gate remains active.');
}
