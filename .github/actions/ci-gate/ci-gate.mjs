import { fileURLToPath } from 'node:url';

export function verifyResults(results) {
  if (results?.changes?.result !== 'success') throw new Error('Change detection did not succeed.');
  const run = results.changes.outputs?.run;
  if (!['true', 'false'].includes(run)) throw new Error('Missing or invalid scope decision.');
  const tests = Object.entries(results).filter(([name]) => name !== 'changes');
  if (tests.length === 0) throw new Error('No test jobs were supplied.');
  const expected = run === 'false' ? 'skipped' : 'success';
  for (const [name, job] of tests) {
    if (job.result !== expected) throw new Error(name + ': ' + job.result + ', expected ' + expected);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyResults(JSON.parse(process.env.CI_RESULTS));
}

