---
name: tugas-saya
description: List semua GitHub issue yang ditugaskan kepada user tertentu di seluruh repository organisasi, lalu opsional urutkan dari tugas termudah. Gunakan untuk permintaan seperti "list semua tugas USER di ORG" atau "urutkan tugas USER berdasarkan yang termudah". Prioritaskan satu GitHub GraphQL search query untuk seluruh organisasi, verifikasi completeness, dan fallback ke pencarian per-repository bila hasil melebihi batas atau GraphQL tidak tersedia.
---

# Tugas Saya

Kumpulkan issue milik assignee tertentu dari seluruh repository dalam sebuah GitHub organization.

## Input

- `ORG`: GitHub organization login.
- `ASSIGNEE`: exact GitHub username.
- `STATE`: default `open`; gunakan `closed` atau `all` bila diminta.
- `SORT_MODE`: `easiest` bila pengguna meminta urutan termudah.
- `INCLUDE_PRS`: default `false`.

Untuk "saya", "my", atau `@me`, resolve login GitHub user yang terautentikasi terlebih dahulu.

## Jalur utama: satu GraphQL query

Gunakan satu request GraphQL dengan GitHub search connection:

```graphql
query AssignedIssues($query: String!) {
  search(type: ISSUE, query: $query, first: 100) {
    issueCount
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ... on Issue {
        number
        title
        state
        url
        body
        createdAt
        updatedAt
        repository {
          nameWithOwner
        }
        assignees(first: 20) {
          nodes { login }
        }
        labels(first: 20) {
          nodes { name }
        }
        milestone { title dueOn }
        comments { totalCount }
      }
    }
  }
}
```

Buat variable `query` sebagai berikut:

- Open issues: `org:ORG assignee:ASSIGNEE is:issue is:open`
- Closed issues: `org:ORG assignee:ASSIGNEE is:issue is:closed`
- All states: `org:ORG assignee:ASSIGNEE is:issue`

Contoh dengan GitHub CLI:

```bash
gh api graphql \
  -f query='query AssignedIssues($query: String!) {
    search(type: ISSUE, query: $query, first: 100) {
      issueCount
      pageInfo { hasNextPage endCursor }
      nodes {
        ... on Issue {
          number title state url body createdAt updatedAt
          repository { nameWithOwner }
          assignees(first: 20) { nodes { login } }
          labels(first: 20) { nodes { name } }
          milestone { title dueOn }
          comments { totalCount }
        }
      }
    }
  }' \
  -F query="org:$ORG assignee:$ASSIGNEE is:issue is:open"
```

## Batas dan verifikasi wajib

GitHub GraphQL search hanya mengembalikan maksimum 100 node per request.

Satu-query mode hanya boleh dianggap lengkap bila semua kondisi berikut benar:

1. `issueCount <= 100`.
2. `pageInfo.hasNextPage == false`.
3. Jumlah node Issue yang diterima sama dengan `issueCount`.
4. Semua node memiliki `repository.nameWithOwner` yang owner-nya sama dengan `ORG`.
5. Semua node benar-benar Issue, bukan PullRequest.
6. Semua node memuat `ASSIGNEE` pada daftar assignees secara case-insensitive.

Jika salah satu kondisi gagal, jangan mengklaim hasil lengkap.

## Fallback bila satu query tidak cukup

Gunakan fallback bila:

- raw GraphQL tidak tersedia pada connector/runtime;
- `issueCount > 100`;
- `hasNextPage == true`;
- jumlah node tidak sama dengan `issueCount`;
- request GraphQL gagal;
- hasil verifikasi tidak konsisten.

Fallback yang benar:

1. Temukan GitHub App installation untuk `ORG`.
2. Enumerasi semua repository dengan `list_repositories_by_installation`, `page_size: 100`, dan pagination `page_offset`.
3. Panggil `search_issues` untuk setiap repository secara terpisah:
   - `repository_full_name`: satu repository saja;
   - `query`: `assignee:ASSIGNEE`;
   - `state`: requested state;
   - `topn`: 100.
4. Untuk `STATE=all`, cari open dan closed secara terpisah.
5. Gabungkan dan deduplicate berdasarkan `lower(repository_full_name) + "#" + issue_number`.
6. Laporkan repository yang gagal diperiksa.

Jangan pernah menggunakan satu `search_issues` dengan array banyak repository sebagai bukti completeness.

## Cross-check

Bila GraphQL dan fallback sama-sama tersedia, bandingkan canonical key `repository#number`.

- Bila sama: hasil terverifikasi.
- Bila berbeda: fetch issue yang hilang secara langsung dan laporkan mismatch yang belum terselesaikan.
- Jangan memilih hasil yang lebih sedikit hanya karena berasal dari satu query.

## Penilaian kemudahan

Nilai sisa pekerjaan berdasarkan body, checklist, labels, komentar manusia terbaru, dependencies, blockers, deadline, akses eksternal, dan progress yang sudah ada.

- `1 — Sangat mudah`: satu tindakan jelas, biasanya <1 jam.
- `2 — Mudah`: beberapa langkah kecil atau riset ringan, biasanya 1–3 jam.
- `3 — Sedang`: beberapa langkah dan koordinasi, sekitar setengah hari.
- `4 — Sulit`: multi-hari, scope besar, atau banyak stakeholder.
- `5 — Sangat sulit/blocked`: implementasi besar, dependency eksternal kritis, legal/pemerintah, atau prerequisite hilang.

Tie-breaker:

1. blocker lebih sedikit;
2. scope tersisa lebih kecil;
3. deadline lebih dekat;
4. updated date lebih lama.

## Output

Mulai dengan:

- Organization dan assignee.
- State.
- Metode: `single GraphQL query` atau `per-repository fallback`.
- `issueCount` GraphQL bila tersedia.
- Total unique issues.
- Status verifikasi completeness.
- Repository gagal atau mismatch bila ada.

Untuk setiap issue tampilkan:

1. Link `repository #number — title`.
2. Estimasi tingkat kesulitan dan waktu.
3. Ringkasan sisa pekerjaan.
4. Blocker/dependency/deadline penting.
5. Alasan urutan.

Jangan mengatakan "semua tugas" kecuali verifikasi completeness berhasil.

## Checklist sebelum menjawab

- [ ] `ORG` dan `ASSIGNEE` benar.
- [ ] Single GraphQL query dicoba terlebih dahulu bila raw GraphQL tersedia.
- [ ] `issueCount`, `hasNextPage`, dan jumlah node diperiksa.
- [ ] Semua result adalah Issue dan assignee tervalidasi.
- [ ] Fallback dijalankan bila one-query mode tidak aman atau tidak tersedia.
- [ ] Hasil dideduplicate.
- [ ] Completeness atau keterbatasan dilaporkan secara jujur.
