# Authentication: requirements

## Metadata

- Feature slug: `auth`
- Status: `ready`
- Date: 2026-10-11
- Source: user request (2026-10-10): "I want to integrate with Supabase for authentication. Show me the flow to integrate with Supabase to allow sign in." The user then answered clarifying questions about sign-in methods, the access model, and the deliverable.
- Related:
  - [Auth architecture](../docs/architecture/auth.md)
  - [ADR-0001](../docs/architecture/decisions/ADR-0001-supabase-auth-ssr.md)
  - [App shell design](../output/designs/app-shell/design-notes.md)
  - Security baseline in [CLAUDE.md](../CLAUDE.md#security-baseline)
  - Sign-in page design (`output/designs/auth/`): not yet created.

## Goal and target user

Only people the owner has invited can sign in to the hub, on phone and laptop browsers. They can use a password, an emailed link or code, or Google. Everything in the hub except the sign-in pages requires a signed-in user.

## Scope

### In scope

- Sign in with email and password.
- Sign in with an emailed magic link, or with a 6-digit code from the same email.
- Sign in with Google, for existing accounts only.
- Accept an invitation and set a password.
- Forgot password / reset password.
- Sign out.
- Protecting all app pages and APIs, and handling an expired session.

### Out of scope

- Public self-registration (sign-up is disabled; decided 2026-10-10).
- An in-app user-management or admin screen (the owner invites users from the Supabase dashboard).
- Other OAuth providers, multi-factor authentication, passkeys, and anonymous sign-in.
- Account deletion and changing email address (to be specified later).
- Linking extra identities with a different email address.

## User journeys

1. **Invite:** the owner invites an email address from the Supabase dashboard. The invitee opens the email, sets a password, and lands on Home.
2. **Daily sign-in:** the user opens the hub, is sent to the sign-in page, chooses a method, and lands where they were going (or on Home).
3. **Forgot password:** the user requests a reset email, opens it, sets a new password, and lands on Home.
4. **Sign out:** the user signs out from the shell footer and returns to the sign-in page.

## Requirements

### AUTH-001 Sign in with email and password (Must)

- Given an invited user who has set a password, when they submit the correct email and password, then they are signed in and taken to their `next` destination (the app page they originally requested) or to `/home`.
- Given a wrong email or password, the page shows "Email or password is incorrect". It does not say which one was wrong, and it keeps the email the user entered.
- An empty or invalid email, or an empty password, shows a field error without calling the server.
- While the request is pending, the submit button is disabled.

### AUTH-002 Sign in with an email link or code (Must)

- Given any email address, when the user requests a sign-in email, the page always shows the same message: "If this email has an account, we sent a sign-in link and code." It then shows a field for entering the code.
- Given an existing account, the email contains both a sign-in link and a 6-digit code. Opening the link, or entering the code, signs the user in and takes them to `next` or `/home`.
- Given an address with no account, no account is created and no email is sent. The page still shows the same message.
- A wrong code shows "That code is invalid or has expired". Using an expired or already-used link shows the generic link-error page (AUTH-009).
- If the user requests emails faster than Supabase allows, the page says "Please wait a moment before requesting another email". It does not reveal whether the account exists.

### AUTH-003 Sign in with Google (Must)

- Given an existing user whose Google account email matches their hub account, when they choose "Continue with Google" and approve, they are signed in and taken to `next` or `/home`.
- Given a Google account whose email has no hub account, no account is created. The user sees "This Google account doesn't have access to the hub."
- If the user cancels at Google, or Google returns an error, they return to the sign-in page with "Google sign-in was cancelled or failed. Try again or use another method."

### AUTH-004 Accept an invitation and set a password (Must)

- Given an invitation email, when the invitee opens the link, they are signed in and taken to **Set password**.
- The new password must be at least 8 characters (assumption A2) and must be typed twice to confirm. Mismatched or too-short passwords show field errors.
- After saving, the user lands on `/home`. From then on they can use any sign-in method.
- An expired or already-used invitation link shows the link-error page (AUTH-009), which tells the user to ask the owner for a new invitation.

### AUTH-005 Forgot and reset password (Must)

- Given any email, when the user requests a reset, the page always shows "If this email has an account, we sent a reset link."
- Opening the reset link signs the user in for recovery and takes them to **Set password** (with the AUTH-004 rules). After saving, they land on `/home`.
- An expired or used reset link shows the link-error page (AUTH-009).

### AUTH-006 Sign out (Must)

- When the user chooses Sign out in the shell, their session on this browser ends and they arrive at the sign-in page with "You have signed out."
- Afterwards, the browser's Back button does not show personal content. Any app page redirects back to sign-in.

### AUTH-007 Protected app and session expiry (Must)

- A signed-out visitor who opens any app page (for example `/finisher`) is sent to the sign-in page. After signing in, they land on that original page.
- A signed-out request to any app API is rejected as unauthenticated and receives no personal data.
- When a session expires or is revoked, the next page load sends the user to sign-in with "Your session has ended. Please sign in again."
- A signed-in user who opens the sign-in page is redirected to `/home`.

### AUTH-008 No public sign-up and no account enumeration (Must)

- No page offers sign-up, and no sign-in method creates a new account.
- None of the messages, status codes, or noticeably different response times reveal whether an email has an account. This applies to the password, email link/code, and forgot-password flows.

### AUTH-009 Link-error page (Must)

- An invalid, expired, or used email link opens a page that says "This link is invalid or has expired." It offers links to sign in and to request a new email.

### AUTH-010 Sign-in pages: layout and accessibility (Must)

- The sign-in page shows the three methods. Password is the default. On a 320px phone they fit without horizontal scrolling.
- All fields have labels. Errors are announced and linked to their field. The page can be used entirely by keyboard with visible focus. Inputs use `autocomplete` (`email`, `current-password`, `new-password`) so password managers work.
- The sign-in pages are not shown inside the app shell. They show only the hub name.

## Business rules

- **Destination:** `next` must be a path inside the hub. Any other value, such as an external URL or `//host`, is replaced with `/home`.
- **Sessions:** a session lasts until the user signs out, or until Supabase's session settings end it (assumption A3). Signing out ends the session only on that browser (assumption A4).
- **Accounts:** accounts exist only through invitation. A Google identity attaches to the existing account that has the same email.

## Confirmed decisions (user, 2026-10-10)

1. Sign-in methods: email and password, magic link or email code, and Google.
2. Access is by invitation only, and public sign-up is disabled.
3. The deliverable for this step is architecture and flow documentation. No code yet.
4. A Supabase project already exists.

## Assumptions

- A1. After sign-in, users land on `/home` when there is no `next` destination, matching the app-shell design.
- A2. The minimum password length is 8 characters. Supabase's project password settings are set to match.
- A3. Supabase's default session lifetime and refresh-token rotation are used.
- A4. Signing out ends only the current browser's session. "Sign out everywhere" is not in scope.
- A5. The default email-link and code expiry is used (1 hour).

## Open questions

- Q1. Should there be a "Sign out of all devices" option?
- Q2. Should invitees be told to use Google directly, or always set a password first? Supabase's documentation doesn't say whether a pending invitee can sign in with Google before accepting the invitation (see architecture R1).
- Q3. Which custom email (SMTP) provider should be used? Supabase's built-in email sending is heavily rate-limited (see architecture).

## Change notes

- 2026-10-11 (implementation): AUTH-002 rate limiting was clarified so that it is consistent with AUTH-008. A per-address email limit shows the same "we sent…" message, and the page offers resend only after a 60-second countdown. "Please wait a moment" appears only for limits that do not depend on the address.
- 2026-10-11: Initial version. This answers the brief's open question about the access model and sign-in method.

## Handoff dependencies

- **Designer:** `output/designs/auth/`, covering sign-in (three methods), check your email with code entry, set password, forgot password, the link-error page, and every validation and error message.
- **Developer:** implement following [docs/architecture/auth.md](../docs/architecture/auth.md).
- **Tester:** the test obligations listed in the architecture doc.
