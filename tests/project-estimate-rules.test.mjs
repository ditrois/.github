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
  [
    'ditrois/property',
    'Cari dan publish 3 listing properti baru — 2026-W30',
    3,
  ],
  [
    'ditrois/property',
    'Cari dan tawarkan pilihan properti untuk buyer #144',
    0.25,
  ],
  [
    'ditrois/property',
    'Follow up buyer cocok: Tanah 90m² di Guwang, Sukawati',
    0.25,
  ],
  [
    'ditrois/property',
    'Tambah at least 5 postingan baru di FB marketplace per hari, Kamis, 23 Juli 2026 — Akun: Dewik/Fitri Property',
    0.5,
  ],
  [
    'ditrois/property',
    'Posting produk non-properti di FB Marketplace, Senin, 6 Juli 2026',
    0.5,
  ],
  [
    'ditrois/property',
    'Masukkan semua calon pembeli dari chat yang belum tercatat ke database',
    0.25,
  ],
  [
    'ditrois/property',
    'Cari 1 developer property di Gianyar, Denpasar, Bangli, Klungkung, dan sekitarnya — Juli 2026',
    4,
  ],
  [
    'ditrois/property',
    'Chat 10 notaris/PPAT untuk penawaran Patok BPN — Agustus 2026',
    4,
  ],
  [
    'ditrois/property',
    'Cari published property di website yang gambar dan videonya jelek — Juli 2026',
    20,
  ],
  [
    'ditrois/property',
    'Closing Keuangan Property — June 2026',
    1,
  ],
  [
    'ditrois/property',
    'Review Listing Rumah123 — Minggu 20 July 2026',
    1,
  ],
  [
    'ditrois/property',
    'Persiapan Sharing Session — Senin, 27 Juli 2026 (2026-07-27)',
    1,
  ],
  [
    'ditrois/property',
    'Update status semua properti saya sampai tugas kosong — 2026-W30 (20 Juli 2026–26 Juli 2026)',
    0.5,
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
  assert.equal(
    estimateFor(
      'ditrois/seratus-art',
      'Cari dan publish 3 listing properti baru — 2026-W30',
    ),
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

test('the canonical rule set is complete and repository-scoped', () => {
  assert.equal(rules.length, 21);
  assert.equal(new Set(rules.map(({ name }) => name)).size, rules.length);
  assert.ok(rules.every(({ repository }) => repository.startsWith('ditrois/')));
});
