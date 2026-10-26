# Eptera booking integration

The backend reads `EPTERA_ENABLED` as a reversible integration switch. It defaults to `true` to
preserve existing installations; the current project setting is `false`.

When disabled, the booking screen receives no live offers or calendar prices, chat and voice agents
cannot query or reuse cached Eptera offers, and the backend blocks reservation, payment-sync,
cancellation, and guest-booking synchronization calls. Existing credentials and saved booking
records are preserved; they are not deleted or rotated.

To restore the integration, set `EPTERA_ENABLED=true` for the backend and restart or redeploy it.
The project environment value is shared by development and production, but production behavior only
changes after a release containing the feature-switch code.
