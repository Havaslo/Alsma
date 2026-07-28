# Reference test data

The backend includes an explicit, idempotent command for loading representative ALSMA records into
the managed development database:

```bash
pnpm run db:seed:reference
```

The command upserts records with reserved UUIDs and can be run repeatedly without creating
duplicates. It covers guest profiles, loyalty balances, stays, site leads, booking requests,
administration requests, manager tasks, knowledge articles, agent rules, response scenarios, and
manager-transfer rules.

The seed is not executed during server startup or migration deployment. This prevents synthetic
records from being inserted automatically in production environments.
