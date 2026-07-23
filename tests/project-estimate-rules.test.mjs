import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rules = JSON.parse(
  readFileSync(new URL('../.github/project-estimate-rules.json', import.meta.url)),
);

function estimateFor(repository, title) {
  const rule = rules.find(
    ({ repository: ruleRepository, title_pattern: pattern }) =>
      ruleRepository.toLowerCase() === repository.toLowerCase()
      && new RegExp(pattern, 'iu').test(title),
  );

  return rule?.estimate ?? null;
}

const recurringIssues = [
  [
    'ditrois/seratus-art',
    'Posting 5 produk seratus art di FB Marketplace, Kamis, 23 Juli 2026',
    0.5,
  ],
  [
    'ditrois/seratus-art',
    'Cek/Update Ongkir Etsy/Kurasi - July 2026',
    4,
  ],
  [
    'ditrois/seratus-art',
    'Closing Kas Bulanan - June 2026',
    4,
  ],
  [
    'ditrois/seratus-art',
    'Cek Billing Etsy - July 2026',
    0.5,
  ],
  [
    'ditrois/seratus-art',
    'Update Harga Produksi Produk - July 2026',
    4,
  ],
  [
    'ditrois/general',
    'Pembayaran BPJS TK - July 2026',
    1,
  ],
  [
    'ditrois/general',
    'Proses gaji bulanan',
    1,
  ],
  [
    'ditrois/personal-jyo',
    'Laporan Keuangan Bulanan Keluarga',
    2,
  ],
];

for (const [repository, title, expected] of recurringIssues) {
  test(`${repository}: ${title}`, () => {
    assert.equal(estimateFor(repository, title), expected);
  });
}

test('rules are scoped to their repository', () => {
  assert.equal(
    estimateFor('ditrois/general', 'Closing Kas Bulanan - June 2026'),
    null,
  );
});

test('unspecified recurring families remain on the general estimator', () => {
  assert.equal(
    estimateFor('ditrois/seratus-art', 'Perbaharui penawaran - 2026-07-20'),
    null,
  );
});

test('shared workflow loads repository-aware rules after adding the item', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/add-to-project.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /actions\/add-to-project@v1\.0\.2/);
  assert.match(workflow, /Apply deterministic estimate/);
  assert.match(workflow, /ruleRepository\.toLowerCase\(\) === repository\.toLowerCase\(\)/);
});
