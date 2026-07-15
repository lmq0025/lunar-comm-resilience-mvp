# Auth and Permissions

Round 6 supports two local auth modes:

- `LUNAR_AUTH_MODE=disabled`: default. Requests run as `local_admin`.
- `LUNAR_AUTH_MODE=local`: login/user/password endpoints are available for local users.

Project and run queries are scoped to the current local user. Admin users can create and disable local users through the user endpoints.

This is a single-machine permission model. It is not designed as a multi-tenant network service.
