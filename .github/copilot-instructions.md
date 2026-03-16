# Copilot Instructions

## 0. Problem-Solving Philosophy
- **No workarounds or loopholes by default.** When an issue is found, identify and evaluate all possible solutions before acting.
- If only workarounds exist, present them to the user and wait for approval — never silently apply a short-term fix.
- Always prefer the correct long-term solution even if it requires more investigation or refactoring.
- Distinguish clearly between a root-cause fix and a band-aid: name them explicitly when presenting options.

## 1. Code Quality
- Use type hints throughout Python code and TypeScript for React.
- Write clear, maintainable, and well-documented code.
- Follow PEP8 (Python) and Airbnb/Prettier (JS/TS) style guides.
- Use docstrings for all services, models, and complex functions.
- Avoid business logic in Django views; use service layers.
- Consistent naming conventions across backend and frontend.
- Centralized exception handling and error reporting.

## 2. Code Efficiency
- Optimize database queries (use select_related, prefetch_related).
- Avoid N+1 query problems.
- Use caching where appropriate (Redis, DRF cache, React Query).
- Minimize unnecessary re-renders in React components.
- Use efficient data structures and algorithms.
- Profile and optimize critical code paths.

## 3. Non-Repeated Code
- DRY principle: abstract repeated logic into reusable functions/services/components.
- Use Django model inheritance and React component composition.
- Avoid copy-pasting code between modules/apps.
- Centralize constants, config, and utility functions.

## 4. UI Development (React)
- Use TypeScript for all React code.
- Follow atomic/component-based design.
- Ensure responsive, accessible, and mobile-friendly UI.
- Use TailwindCSS or MUI for styling.
- Use React Query or Axios for API calls.
- Implement error boundaries and loading states.
- Provide clear user feedback for actions and errors.
- Use charting libraries (e.g., Recharts) for data visualization.

## 5. Database Management
- Use PostgreSQL exclusively.
- Use UUIDs for primary keys.
- Normalize core fields; store flexible data in JSONField.
- Enforce data integrity with constraints and indexes.
- Use Django migrations for all schema changes.
- Never hardcode secrets or credentials.

## 6. Security
- Use Django security middleware and secure headers.
- Enforce HTTPS in production.
- Use JWT authentication and secure cookies.
- Implement CSRF protection and CORS configuration.
- Validate all user input (backend and frontend).
- Rate limit sensitive endpoints (auth, import).
- Never commit secrets or sensitive data.
- Use environment variables for all secrets.

## 7. Testing
- Use pytest and pytest-django for backend; React Testing Library/Jest for frontend.
- Minimum 80% coverage (backend and frontend).
- Write unit tests for all services, math, and parsing logic.
- Write integration tests for API endpoints and UI flows.
- Test edge cases (multi-phase damage, upcasting, schema variants).
- CI must fail if coverage drops below threshold.

## 8. DevOps & CI/CD
- Use Podman and podman compose for local and production environments (originally planned with Docker, migrated to Podman).
- Multi-stage container builds (Podman); use non-root user.
- Separate containers for backend, frontend, db, and cache.
- Use GitHub Actions for CI/CD: lint, type check, test, build, deploy.
- Fail pipeline on any lint, type, or test error.
- Use .env files for environment configuration.
- **Container port binding**: Always use `podman-compose` (via `compose.yml`) for starting containers — never raw `podman run` for long-lived services, as manual runs default to IPv4-only and diverge from compose config.
- **Networking on Windows/WSL**: The frontend container must be on port 80 (not 3000). The Windows hosts file has `127.0.0.1 localhost` set explicitly so `http://localhost` resolves to IPv4 — do not remove this entry. When recreating containers, use ONLY `-p 0.0.0.0:80:80` — **never** add `-p [::1]:80:80`. WSL's `wslrelay.exe` accepts TCP on `[::1]:80` but cannot forward HTTP, causing the browser (via Happy Eyeballs) to silently connect via IPv6 and then spin forever on page load.
- **After any backend rebuild**: The Django superuser password is NOT reset by a backend container rebuild — the password lives in the PostgreSQL volume which persists across rebuilds. Only run a password reset if the database volume was wiped.
- **After any backend container recreation**: Always restart the frontend container immediately after (`podman restart spellwright_frontend_1`). nginx resolves the upstream hostname (`spellwright_backend_1`) once at startup and caches the IP — if the backend container is recreated it gets a new IP, causing all proxied API calls to fail with 502 Bad Gateway until nginx is restarted.
- **Rebuild after every code change — but ask first**: When code changes are complete and a rebuild is needed, **always ask the user** "Ready to rebuild now, or continue working on more changes first?" before running any rebuild command. Only run `.\scripts\rebuild.ps1` (or `-Frontend`) after the user confirms. This avoids wasting rebuild time when more changes are coming. At the end of a session, do not close out without confirming the rebuild succeeded and the app is running at http://localhost/.
- **Always `git pull` before starting work**: This is a solo repo but the remote can diverge from local — e.g. due to prior GitHub web UI edits or commits made from a different environment (WSL vs Windows). This project has both a Windows working directory and a WSL copy (the rsync in rebuild.ps1)Always run `git pull` at the start of every session to avoid merge conflicts during push. Windows is the single source of truth for commits — never commit or push directly from WSL.

## 9. Documentation
- Maintain a clear, up-to-date README with setup, usage, and deployment instructions.
- Document all environment variables and configuration options.
- Use docstrings and JSDoc for code documentation.
- Generate and maintain OpenAPI schema for backend API.
- Document API endpoints and expected request/response formats.
- Provide user-facing documentation for import/export formats and error messages.
- **Filename date suffix**: All new documentation files must end with the date in `yyyymmdd` format (e.g., `Spellwright_Progress20260316.md`). Never create a doc file without a date suffix.
- **Document header**: The top of every documentation file must include a brief description/summary of the file's purpose, contents, and the date it was created or last significantly updated. Format:
  ```
  # <Title>
  **Date:** yyyy-MM-dd  
  **Summary:** <1–3 sentence description of what this document covers and why it exists.>
  ```

## 10. Logging & Monitoring
- Use structured JSON logging in production.
- Console logging in development.
- Log all errors, warnings, and critical events.
- Integrate with error tracking (e.g., Sentry) for backend and frontend.
- Log analysis engine inputs for debugging.

## 11. Scalability & Extensibility
- Design for horizontal scaling (stateless services, cache, etc.).
- Prepare for background jobs (Celery-ready backend).
- Use modular, feature-based Django apps and React components.
- Support dynamic JSON schema ingestion and flexible data models.
- Plan for plugin/extension support in future versions.

## 12. Accessibility & Internationalization
- Ensure all UI components are accessible (WCAG compliance).
- Use semantic HTML and ARIA attributes.
- Prepare for future i18n/l10n support.

## 13. Objective Staging & Doc Classification
- **Active staging file**: `documentation/Spellwright_Objectives` is the single source of truth for unclassified and in-progress objectives. `Spellwright_updates20260314.md` is retired from staging.
- **Whenever new items appear in `Spellwright_Objectives` without a dev note**, classify them before or alongside implementation:
  1. Group the item under an appropriate category heading (UI, Spells, Spellbooks, Calculations, Infrastructure, Testing, etc.) — create a new category if no suitable one exists.
  2. Add a `> **Dev note:**` block covering: what currently exists in the codebase relevant to this request, what files/models/hooks would need to change, estimated effort (Trivial / Quick win / Small / Medium / Large), and any design decisions or alternatives.
  3. Mark completed items with `✅ Done — <date>` and leave them in place so history is preserved.
  4. Leave unclassified raw drops struck-through with a `→ Classified` note pointing to the section they were moved to.
- **Progress updates**: After completing any objective, update `Spellwright_Objectives` immediately — mark it done, add any relevant notes.
- When an item is too vague to classify accurately, add a `> **Needs clarification:**` note and ask the user before implementing.

---

_This file is a living document. Update as project requirements evolve._
