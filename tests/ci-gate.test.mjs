import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyResults } from '../.github/actions/ci-gate/ci-gate.mjs';
const fixture = (run, result) => ({
  changes: { result: 'success', outputs: { run } }, tests: { result },
});
test('gate accepts only full success or explicitly irrelevant skipped tests', () => {
  assert.doesNotThrow(() => verifyResults(fixture('true', 'success')));
  assert.doesNotThrow(() => verifyResults(fixture('false', 'skipped')));
  for (const result of ['failure', 'cancelled', 'skipped', 'neutral', 'timed_out', undefined]) {
    assert.throws(() => verifyResults(fixture('true', result)));
  }
  assert.throws(() => verifyResults(fixture('false', 'failure')));
});
test('gate fails closed on missing, failed, cancelled or malformed scope results', () => {
  for (const results of [{}, null, fixture(undefined, 'success'), fixture('other', 'success'),
    { changes: { result: 'failure' }, tests: { result: 'success' } },
    { changes: { result: 'cancelled' }, tests: { result: 'success' } },
    { changes: { result: 'success', outputs: { run: 'true' } } }]) {
    assert.throws(() => verifyResults(results));
  }
});

