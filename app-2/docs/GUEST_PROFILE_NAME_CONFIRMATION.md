# Guest profile name confirmation

- Existing guest profiles are created with `full_name_confirmed_at = NULL` by
  the additive migration. After email-code sign-in, the account requires each
  existing user to review, change if needed, and confirm the name once.
- Confirmation stores the submitted name and a timestamp atomically only while
  the confirmation timestamp is still empty. A repeated profile-completion
  request cannot replace a confirmed name.
- Booking and service-order flows may fill a missing name, but must not replace
  a non-empty profile name. Names entered while creating a new guest profile
  during booking or checkout are treated as explicitly supplied and confirmed.
- Email-code-created profiles without a supplied name remain unconfirmed and
  are asked to provide it in the account before using the account sections.
- Administrative client editing remains an explicit staff action; ordinary
  sign-in, bookings, and orders do not automatically change a confirmed name.
