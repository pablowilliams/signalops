# Threat model

## Protected assets

Analyst notes, incident status, user identity headers, benchmark audit history, API availability, and integrity of published evidence.

## Trust boundaries and mitigations

- Browser to hosted route: accept a small JSON action schema, reject unknown actions, use prepared D1 statements, and attach records to the authenticated header identity.
- Identity headers: trusted only when injected by the hosting platform; local fallback is explicitly demo-scoped.
- User data: every D1 read and write is filtered by `userId`; audit events record mutations.
- API input: Pydantic validates experiment payloads and FastAPI returns structured errors.
- Supply chain: lockfiles are committed and CI runs tests, lint, build, and dependency audit reporting.
- Secrets: none are required for the deterministic path; `.env.example` contains placeholders only.

## Known risks

The local demo fallback must not be reused for a public multi-tenant deployment. Notes are plain text and should receive explicit length limits and content handling before enterprise use. Rate limiting, centralized authorization, encryption-key governance, SAST, image signing, and retention policies belong in a production rollout.
