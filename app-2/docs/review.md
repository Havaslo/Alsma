# Backend review checklist

Before completing backend work:

- Run Prisma validation and generation.
- Run `pnpm run format:check`, `pnpm run typecheck`, and `pnpm run build`.
- Verify `/health` and `/api/health` when application containers are available.
- Exercise the affected API workflow without resetting, reseeding, or replacing database data.
- Keep secrets out of source, responses, logs, and generated environment files.
- Confirm the project repository remains on `main` when Git history resolution is required.
