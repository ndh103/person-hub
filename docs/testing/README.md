# Testing contract

Tester owns `docs/testing/<feature>.md`. Include:

- Metadata/status and links to requirements, design, architecture, and implementation.
- Coverage table: requirement ID, scenario, test layer, script/test path, outcome.
- Test environment, safe fixture setup/cleanup, and prerequisites.
- Automated commands and actual results, including skipped or unavailable checks.
- Phone/laptop and accessibility coverage where relevant.
- Security matrix for anonymous user, owner, and other user across API and direct Supabase operations.
- Defects with severity, reproduction, expected/actual results, and sanitized evidence.
- Remaining risks and readiness recommendation.

Keep executable tests in the implementation's test directories and RLS tests in `supabase/tests/`. Do not commit secrets, authenticated browser state, or private test data. No product test suite exists before implementation.
