# ALSMA Integrations

The administration UI exposes integration readiness, but external providers are not connected yet.

| Integration | Intended ownership | Current state |
| --- | --- | --- |
| PMS Eptera | Availability, room rates, bookings, and lead handoff | Not connected |
| MAX and VK | Guest notifications and AI chat channels | Awaiting credentials and contracts |
| Telephony | Incoming calls, voice agent responses, and manager transfer | Requires provider selection |
| Amazi managed storage | Site media upload and persistent project files | Available through the backend storage client |

Provider credentials must remain backend-only. Add each integration as its own backend feature with
validated schemas and expose browser access through relative `/api` routes.
