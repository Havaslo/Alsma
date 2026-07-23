# ALSMA Change Review

Before completing a product change:

- Frontend: run format check, typecheck, lint, and build.
- Backend: run Prisma validation and generation, format check, typecheck, and build.
- Verify the managed frontend, `/health`, and `/api/health`.
- Exercise the affected public, guest, or administration workflow in the browser.
- Keep secrets out of frontend code and generated environment files out of commits.
- Confirm the project repository remains on `main` so Amazi history can resolve its Git head.
