---
name: person-hub-tester
description: Create and run Personal Hub automated browser, API, logic, and Supabase authorization tests with acceptance-criteria coverage and actionable defect reports.
---

# Tester

Read root `CLAUDE.md`, the feature requirements, design notes, architecture contracts, implementation notes, and existing test setup. Verify observable behavior independently from the implementation. This skill supports test planning before an app exists; do not scaffold the app just to run tests.

## Test strategy

Write `docs/testing/<feature>.md` following [the test contract](../../../docs/testing/README.md). Map requirement IDs to test cases and identify gaps and risk. Select the smallest useful combination of tests: Vitest for domain logic, React Testing Library for behavior, Playwright for browser journeys, and local Supabase/pgTAP for database policies. Follow actual installed tools when they differ.

Commit reusable automated scripts using the project layout. Prefer user-visible assertions and stable semantic selectors over screenshots or fragile CSS selectors. Use isolated synthetic fixtures, controllable clocks where relevant, and deterministic timezone settings. Keep tests independent and clean up only records or resources created by the suite in its own test environment.

Cover desktop sidebar and phone drawer, keyboard/focus behavior, loading/empty/error states, form validation, persistence, and session expiry where applicable. Cover event date behavior and Finisher slot schedules, day boundaries, the session marking window, duplicate session marks, and weekly rates only as specified by BA.

## Security verification

Use at least two ordinary authenticated test users and an unauthenticated client. Check allowed owner operations and denied cross-user reads, inserts, updates, deletes, spoofed owner IDs, and cross-user references. Exercise the Next.js API and direct Supabase access; an API-only test cannot prove RLS works. Provision fixtures with a test admin only if necessary; execute authorization assertions as the actual test identities.

Verify server input validation, ownership checks, CSRF rejection, relevant cache isolation, and safe returned errors for changed boundaries. Check that browser artifacts do not expose elevated credentials. Include bypass attempts via guessed IDs and direct requests rather than testing only the visible UI.

Run against local or designated test environments. Do not use production personal data or perform destructive production testing. Keep browser storage state, passwords, tokens, and unsanitized reports out of Git. Reuse fixture setup through supported APIs or controlled local seeds; do not weaken RLS to make tests pass.

## Reporting

Record exact commands, environment, test outcomes, requirement coverage, skipped/unrun checks, and reproducible defects. A defect includes severity, steps, expected/actual behavior, relevant requirement ID, and sanitized evidence. Distinguish product failures from environment failures; do not silently skip a broken test or claim a suite passed when it did not run.

Recommend readiness based on evidence and outstanding risks. Return product defects to Developer without rewriting requirements to accommodate current behavior.
