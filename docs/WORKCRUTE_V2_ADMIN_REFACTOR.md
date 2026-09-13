# Workcrute V2 - Admin refactor

## Scope and baseline

Request: attachment 32537e7e-7e06-43df-b42c-c37a0b918ae8, read in full.
Baseline main: 7150c01. Existing package-lock.json and UI captures are preserved.
The latest specification restores the visible French term Ouvrier; internal employee identifiers remain unchanged.

## Sequential progress

- A: validated. Git, journal, authentication, admin shell, Worker, D1, translations and tests inspected.
- B: validated. Lucide eye/eye-off, translated accessible labels, public browser reveal/conceal tests.
- C: validated. Header contains language and logout only. Authentication integration confirms session revocation.
- D: validated. Recoverable sidebar toggle, mobile overlay, Escape, inert hidden navigation. Chrome layout tests: 320, 360, 390, 768, 1024, 1440, 1920, FR/EN/AR.
- E: implemented and API tested. Dashboard collapsible lists and real processed/pending counters.
- F: validated. Seven exact status filters, persistent status updates, phone search, stale response protection, redundant counters removed.
- G: validated. Centered applicant dialog, internal scroll, five collapsible sections, save after history. Chrome opens real local dossiers at 390 and 1440 in three languages.
- H: validated locally. Migration 0022 preserves legacy notes, adds append-only dated notes and received/note events. Status, notes and archive filter integration passes.
- I: implemented and existing permission/rotation/disable tests pass. Function is no longer required for account creation. Passwords remain hashed and never returned.
- J: validated locally. Migration 0023 tracks seeded calendar years. Official Etalab data is fetched once per year; deleted holidays are not recreated. Holiday CRUD, impossible dates and concurrent approvals under the 21-day ceiling pass.
- K: validated locally. Migration 0024 adds retained notifications. Keep/delete persistence tested; real sidebar unread badge.
- L: implemented. Error module navigation removed; old UI redirects to dashboard. Backend diagnostics retained.
- M: implemented and integration tested locally. D1-backed trilingual question CRUD, public configuration, activation/order and required-answer validation. Historical answers remain readable after soft deletion.
- N: implemented and integration tested locally. Unified security page; blank replacement password preserves the existing hash. No password/hash/salt is returned by the account API.
- O: verification in progress. Language events now bubble to modules listening on window; the obsolete missing error-system.js injection and mobile language-selector hiding are removed. Applicant field labels and official holiday labels are translated.
- P: local layout checks passed for seven admin routes in FR/EN/AR at 320, 360, 390, 768, 1024, 1440 and 1920 px, across focused runs. After transient local navigation failures, remaining widths were rerun successfully. Applicant modal waits were increased from 3 to 15 seconds without removing layout assertions. Visual inspection caught crowded leave summary fields in Arabic; spacing was corrected and 320/390 px rerun successfully. Public responsive checks also passed, including actual CV submissions in three languages.
- Q/R: npm run test:v2-all passed (applicants, admin applications/questions/notes, authentication, employees, leave, i18n, legacy retirement, responsive, quality and security). npm run check passed; public corrections/CORS checks passed. Additional answer-type/whitespace checks passed. Production persona acceptance is still pending, so this is not global mission validation.
- S/T: pending. No admin commit, remote migration, deployment or production acceptance has occurred yet.

## Queued employee mission

Attachment fccc1085-c8f5-427c-8742-ce61a05b00ed was read in full. User explicitly requires finishing and publishing this admin mission before starting employee changes. The employee implementation has therefore not started.

## Publication status

Published on 2026-09-14.

- Logical remote D1 export saved locally before migration: `output/backups/workcrute-before-admin-20260914.sql` (ignored by Git).
- Remote migrations applied: 0022, 0023, 0024 and 0025.
- Commit: `dad969d feat(admin): complete control center refactor`, pushed to `main`.
- Worker deployed: version `2c148736-6afe-4a6e-ac1a-4812f6d71605` at `https://workcrute.aetbconseil.workers.dev`.
- Pages deployed: `https://f65bd0e9.workcrute.pages.dev`, production URL `https://workcrute.pages.dev`.
- Production acceptance passed: public pages and questions endpoint, administrator sign-in, dashboard/questions/leave/notifications protected APIs, and logout.

## Official calendar source

https://github.com/etalab/jours-feries-france-data
The former calendrier.api.gouv.fr host failed DNS resolution locally; the official Etalab JSON exports work and are cached in D1.
