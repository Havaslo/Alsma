# Frontend Review

After changing the frontend:

- Run `pnpm run format`, `pnpm run format:check`, `pnpm run typecheck`, `pnpm run lint`, and `pnpm run build` from `frontend`.
- Run relevant existing tests when the frontend defines them; do not add a test runner only for review.
- Fix applicable failures and rerun the failed checks.
- Confirm changed files remain focused and follow the size limits in the nearest `AGENTS.md`.
- Confirm the managed frontend process is running and inspect its logs for runtime errors.
