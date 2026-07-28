# Frontend review checklist

Before completing frontend work:

- Run `pnpm run format:check`, `pnpm run typecheck`, `pnpm run lint`, and `pnpm run build`.
- Verify the managed frontend, `/health`, and `/api/health` when application containers are available.
- Exercise the affected public, guest, or administration workflow.
- Keep secrets out of frontend code and generated environment files out of commits.
- Confirm the project repository remains on `main` when Git history resolution is required.
