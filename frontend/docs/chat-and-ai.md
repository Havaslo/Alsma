# Chat and AI SDK Integration

The scaffold includes a transport-agnostic chat UI under `src/components/chat`:

- `Chat.tsx` composes the header, scrollable history, empty state, and composer.
- `ChatMessageItem.tsx` renders assistant, user, and system messages.
- `ChatComposer.tsx` owns the draft, file picker, Enter-to-send behavior, and pending state.
- `chat-types.ts` defines the small UI contract consumed by the components.

`Chat` does not call an API directly. It accepts `messages`, `isSending`, and an `onSubmit` callback.
Keep this boundary when connecting a backend so the visual components remain reusable and testable.

## Connecting Vercel AI SDK Later

When streaming AI chat is requested, install the official packages from the frontend directory:

```bash
pnpm add ai @ai-sdk/react
```

Use `useChat` from `@ai-sdk/react` in a feature hook or page, not inside the reusable UI components.
Configure its transport with the matching primitives from `ai`, map AI SDK UI messages into the
scaffold's `ChatMessage` shape, and pass the hook status into `isSending`. Adapt `ChatSubmitInput`
to the hook's send method in the page-level integration. Keep provider keys and model execution on
the backend; browser code should call a relative `/api` route.

AI SDK message content may be represented as typed parts rather than one string. Perform that
conversion in a dedicated adapter so rich tool, reasoning, and attachment parts can be added later
without coupling `ChatMessageItem` to one transport version.

The reference `_SHOWCASE_PAGE.tsx` uses local state and a short simulated response. Replace that showcase
adapter when connecting a real endpoint; do not replace the chat presentation components.
