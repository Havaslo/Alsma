# Data Requests and Forms

## API boundary

- Use the shared `apiClient`; browser requests use relative `/api` URLs.
- Components and pages do not call `apiClient` directly.
- Keep request functions and TanStack Query hooks in their owning `src/lib` domain.
- Include pagination and applied filters in query keys.
- Never expose backend secrets through `VITE_*` variables.

## Forms

- Use `components/Form.tsx` and React Hook Form for every submit flow.
- Register native controls directly.
- Use `Controller` only for controlled product components such as `DatePicker` and
  `DropdownSelect`.
- Keep validation aligned with the backend schema. Add Zod and `@hookform/resolvers` where a form
  needs cross-field or structured validation.
- Keep mutation pending, success, and error feedback visible at the form boundary.

## Server state

TanStack Query owns server reads, writes, caching, and invalidation. Local React state is reserved
for transient UI interaction such as selected tabs, open dialogs, and carousel position.
