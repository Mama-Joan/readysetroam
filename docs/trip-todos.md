# Trip to-dos

Optional Trip.todos array; existing trips need no migration. Each item has id, title, done (boolean), optional category, due (ISO date or empty), who, notes. Stored with the trip in existing localStorage.

Version 1 imports accept todos. Version 2 changes support addTodo (todo), updateTodo (todoId, before, todo), removeTodo (todoId, before). Before is the complete existing task. Stable IDs and conflict checks apply. Example:
```json
{"version":2,"operation":"update","tripId":"example-trip","changes":[{"action":"addTodo","todo":{"id":"insurance","title":"Purchase travel insurance","done":false,"category":"Preparation"}}]}
```
No background notifications or cross-device sync. Do not put private documents or credentials in import links.

Test: build; open old trip; add, edit, complete, reopen, filter and delete tasks; verify due date and overdue display; refresh; verify separate trips have separate lists; import v1 with tasks; apply v2 add, repeat, update, stale conflict, remove; verify stop patches preserve tasks and bookings; verify cancel and backup. 
