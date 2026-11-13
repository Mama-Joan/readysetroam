# Cloud sync rollout

Google OAuth via Supabase; production GitHub Pages and localhost redirect to their respective app roots. Use only the public project URL and publishable key in the browser.

## Private storage
The existing public.trips table uses (owner_id,id) as primary key, JSONB data, version and timestamps. RLS restricts CRUD to auth.uid() = owner_id. A trigger increments version on update.

## Implementation stages
1. Google sign-in and sign-out; no trip uploads during sign-in.
2. Explicit migration preview from existing browser storage. Never overwrite a cloud trip with the same ID automatically. Keep original local backup.
3. Account-scoped cloud trip store, conditional updates/deletes using expected version, visible errors and conflict recovery. Do not mix private data between accounts. Preserve v1 and v2 import validation and adapt localStorage stale checks to cloud versions.
4. Revocable unguessable guest links via dedicated restricted RPC returning only explicitly selected, sanitized fields. Never grant anonymous access to private trips. No booking confirmations, private notes or expenses by default.
5. Test two accounts, anonymous access, refresh, migration conflicts, logout, import, concurrent edits, network failure and revoked links before production.

Full offline write synchronization and collaborative editing are deferred. Existing local-only mode remains available until migration is explicitly confirmed.
