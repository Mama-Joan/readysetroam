# Incremental trip updates (v2)

Use the existing #import= URL with encodeURIComponent(JSON.stringify(payload)), or paste/upload JSON in Import AI trip. Version 1 imports remain unchanged.

Example (fictional trip):
```json
{"version":2,"operation":"update","tripId":"example-trip","changes":[{"action":"addStop","date":"2027-01-01","stop":{"id":"example-lunch","time":"12:00","title":"Lunch","kind":"meal","status":"planned"}}]}
```

Supported actions: addStop, updateStop, removeStop. Update and remove require date, stopId and before (the complete original stop); update also requires stop (complete replacement with same ID). Export the latest trip before modifying existing stops. Additions may reference existing place IDs only. Booked stops, flights and stays are protected. Other trip fields are not patched in this release. Do not include sensitive information in URLs.

Preview is atomic: conflicts block the whole patch. Repeated identical single-stop additions/updates and absent removals are no-ops. Use stable IDs. A local backup of the previous trip is saved under readysetroam.patch-backup.<tripId> before applying; this is a single rolling backup, not a history or undo UI. Save as separate copy remains available.

Manual verification:
- Import a fictional v1 trip, then add a stop with a v2 payload.
- Cancel preview and verify no change; reopen and apply.
- Repeat the same patch and verify apply is disabled.
- Edit a stop locally and submit an update with stale before; verify conflict.
- Attempt to remove a booked stop; verify rejection.
- Verify other days, bookings, budget and trip ID remain unchanged.
- Test invalid JSON, unknown trip, unknown place, duplicate date and oversized link.
- Verify backup exists and reload preserves the updated trip.
- Verify v1 duplicate import still saves a separate copy.
