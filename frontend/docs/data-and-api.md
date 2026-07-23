# Data Requests and Forms

## API Boundary

- Use the shared `apiClient` for HTTP requests.
- The shared client uses `/api` by default. Implement corresponding server behavior in `../backend` without hardcoding preview hosts or ports.
- Keep Vite's `/api` proxy path intact. The platform supplies its private target through `BACKEND_PROXY_TARGET`.
- Use a process-level `VITE_API_BASE_URL` override only for standalone tooling or Amazi history previews. Project custom variables cannot use the `VITE_` prefix.
- Never expose `BACKEND_PROXY_TARGET` or other server secrets through a `VITE_*` variable.

## Server State

- Route every component-initiated server read and write through TanStack Query.
- Components and pages must not call `apiClient` directly.
- Keep reusable request functions and query or mutation hooks in `src/lib`.
- Use `useApiQuery` and `useApiMutation` for basic TanStack Query requests.
- Configure request-specific behavior where the hook is used.
- Use `getPaginated` for paginated list requests.
- Include the normalized pagination parameters returned by `withPaginationDefaults` in TanStack Query keys.
- Include applied `AutoFilter` values in both the request parameters and query key when filters are server-backed. Keep draft-only modal state out of query keys.

### Infinite Lists

Use the scaffold `useInfiniteQuery` wrapper for endpoints that return the shared `items` and
`pagination` envelope. It flattens loaded pages into `items`, calculates the next page from the
response metadata, forwards request cancellation, and reports request errors consistently.

Render `InfiniteScrollObserver` after the current items to request another page when the sentinel
approaches the viewport. Keep filters and `pageSize` in the query key, but omit the current page;
the hook owns that page cursor.

```tsx
const projectsQuery = useInfiniteQuery<Project>(
  ["projects", "infinite", { pageSize: 20, status }],
  (page, signal) =>
    getPaginated<Project>(
      "/projects",
      { page, pageSize: 20, status },
      { signal },
    ),
);

return (
  <>
    {projectsQuery.items.map((project) => (
      <ProjectCard key={project.id} project={project} />
    ))}
    <InfiniteScrollObserver
      hasNextPage={Boolean(projectsQuery.hasNextPage)}
      isFetchingNextPage={projectsQuery.isFetchingNextPage}
      onLoadMore={() => void projectsQuery.fetchNextPage()}
    />
  </>
);
```

Use explicit pagination controls instead when users need stable page URLs, direct page jumps, or a
predictable position after navigation. The observer is an enhancement for continuous feeds, not a
replacement for every paginated interface.

## Forms

- Use React Hook Form for non-trivial forms.
- Use Zod schemas for user-facing validation and `@hookform/resolvers` when the form needs schema integration.
- Keep form validation aligned with the API contract.

## Chat

- Keep the reusable chat UI transport-agnostic and connect it from a page or feature hook.
- See `docs/chat-and-ai.md` before adding `ai`, `@ai-sdk/react`, streaming, tools, or provider-specific message parts.
- Keep model credentials and execution on the backend and send browser requests through relative `/api` routes.
