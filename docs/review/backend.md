# Backend Review

After changing the backend:

- Run `pnpm run format`, `pnpm run format:check`, `pnpm run typecheck`, `pnpm run db:generate`, `pnpm run db:check`, and `pnpm run build` from `backend`.
- Run relevant existing tests when the backend defines them; do not add a test runner only for review.
- Fix applicable failures and rerun the failed checks.
- Confirm changed files remain focused and follow the size limits in the nearest `AGENTS.md`.
- Confirm the managed backend process is running and inspect its logs for runtime errors.
