# Data Requests and Forms

## API Boundary

- Use the shared `apiClient` for HTTP requests.
- The shared client uses `/api` by default. Implement corresponding server behavior in `../backend` without hardcoding preview hosts or ports.
- Keep Vite's `/api` proxy path intact. The platform supplies its private target through `BACKEND_PROXY_TARGET`.
- Never expose `BACKEND_PROXY_TARGET` or other server secrets through a `VITE_*` variable.

## Server State

- Route every component-initiated server read and write through TanStack Query.
- Components and pages must not call `apiClient` directly.
- Keep reusable request functions and query or mutation hooks in `src/lib`.
- Use `useApiQuery` and `useApiMutation` for basic TanStack Query requests.
- Configure request-specific behavior where the hook is used.
- Use `getPaginated` for paginated list requests.
- Include the normalized pagination parameters returned by `withPaginationDefaults` in TanStack Query keys.

## Forms

- Use React Hook Form for non-trivial forms.
- Use Zod schemas for user-facing validation and `@hookform/resolvers` when the form needs schema integration.
- Keep form validation aligned with the API contract.
