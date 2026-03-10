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
- **After any backend rebuild**: The Django superuser password is reset to the default in the repo memory. Always re-run `podman exec dndoptimizer_backend_1 python manage.py shell -c "...set_password..."` or use `changepassword` after rebuilding the backend container.
- **After any backend container recreation**: Always restart the frontend container immediately after (`podman restart dndoptimizer_frontend_1`). nginx resolves the upstream hostname (`dndoptimizer_backend_1`) once at startup and caches the IP — if the backend container is recreated it gets a new IP, causing all proxied API calls to fail with 502 Bad Gateway until nginx is restarted.

## 9. Documentation
- Maintain a clear, up-to-date README with setup, usage, and deployment instructions.
- Document all environment variables and configuration options.
- Use docstrings and JSDoc for code documentation.
- Generate and maintain OpenAPI schema for backend API.
- Document API endpoints and expected request/response formats.
- Provide user-facing documentation for import/export formats and error messages.

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

---

_This file is a living document. Update as project requirements evolve._
