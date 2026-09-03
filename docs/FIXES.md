# HealthSpan Reusable Fixes

This file starts empty intentionally. Add entries when a problem has been solved and the solution is likely to be useful again.

## FIX-001 — pdf.js worker fails under Next.js Turbopack ("[project]" module)

### Symptom

Loading a PDF in the OCR scan path threw:

```
Setting up fake worker failed: "Cannot find module
'.../healthspan/[project]/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs
[app-route] (ecmascript)' imported from
.../.next/dev/server/chunks/node_modules_pdfjs-dist_legacy_build_pdf_mjs_...js"
```

### Cause

`pdfjs-dist` loads its web worker by executing a runtime dynamic import of
`GlobalWorkerOptions.workerSrc`:

```js
const worker = await import(this.workerSrc); // workerSrc = path string
```

Turbopack statically rewrites that dynamic import regardless of the value
assigned to `workerSrc`. Assigning a bare filesystem path (via
`createRequire().resolve(...)` + `pathToFileURL`) still got rewritten into the
invalid `[project]/.../pdf.worker.mjs [app-route] (ecmascript)` specifier, which
does not exist on disk. Setting `workerSrc` to any *string* cannot fix this.

### Solution

Give the worker as a Turbopack **asset URL** so `workerSrc` resolves to a real
emitted file at runtime instead of a module specifier Turbopack can mangle. Use
the Next.js-supported `new URL(packagePath, import.meta.url)` asset pattern:

```ts
const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url,
).toString();
```

Turbopack rewrites `new URL(packagePath, import.meta.url)` into a runtime asset
reference (e.g. `new URL(e.R(10024)).toString()`) that returns the `file://` URL
of the emitted worker file (`.next/server/assets/pdf.worker.*.mjs`). Because it
is a plain string, it passes pdf.js's `workerSrc` type check, and because it is a
real on-disk file, the runtime `import(workerSrc)` can load it.

Note: the earlier `?url` import form (`import('...pdf.worker.mjs?url')`) does
compile, but in the dev server it returns a module object rather than a string,
triggering `Invalid workerSrc type`. The `new URL(..., import.meta.url)` form
yields a string and is the robust choice.

### Prevention

- For pdf.js + Turbopack, always set `GlobalWorkerOptions.workerSrc` with the
  `new URL('pdfjs-dist/.../pdf.worker.mjs', import.meta.url).toString()` asset
  form so it is a runtime asset URL string.
- Do not assign `workerSrc` a bare filesystem path; Turbopack rewrites pdf.js's
  dynamic `import(workerSrc)` and will mangle it into `[project]`.
- Do not use `import('...?url')` for the worker on the server; it may be a module
  object, not a string.

### Related Task

KI-002

## FIX Template

```markdown
## FIX-XXX — Short title

### Symptom

What failed or behaved incorrectly.

### Cause

The underlying cause.

### Solution

The implemented solution.

### Prevention

How to avoid the same issue in future.

### Related Task

TASK-XXX
```

## Initial Guidance

### FIX-001 — Do not re-parse jsonb columns that node-postgres already deserialized

### Symptom

`GET /api/health-data` and `POST /api/export` failed for seeded users with:
`SyntaxError: "[object Object]" is not valid JSON`, thrown from `mapAudit` in
`lib/repositories/healthStoreRepository.ts`.

### Cause

`audit_events.previous_value` and `new_value` are `jsonb` columns. node-postgres
automatically deserializes `jsonb`/`json` values into JS objects/arrays at the
driver level. The mapper then called `JSON.parse(value)` on the already-parsed
object, and `JSON.parse(obj)` coerces the object to the string `"[object Object]"`,
which is not valid JSON, so it threw. Nullable columns silently skipped the path;
the demo seed with a single null-valued audit row masked the bug until real audit
rows (with values) were loaded from the migrated admin account.

### Solution

Added a defensive `jsonParse` helper in `lib/repositories/healthStoreRepository.ts`:

```ts
function jsonParse(v: unknown): unknown {
  if (v == null) return undefined;
  if (typeof v === 'object') return v; // already deserialized by pg
  try {
    return JSON.parse(String(v));
  } catch {
    return undefined;
  }
}
```

`mapAudit` now uses `jsonParse(r.previous_value)` / `jsonParse(r.new_value)`.

### Prevention

When a PG column type is `json`/`jsonb`, do not `JSON.parse` the value returned by
`pg` — it is already a JS object. If the value may come from either a driver-parsed
object or a stored string, use a helper that returns the object directly when it is
already an object (as above). Add load tests on accounts that actually have these
columns populated, not only null-valued rows.

### Related Task

PostgreSQL migration & API validation.

### FIX-002 — CREATE TABLE IF NOT EXISTS never alters existing tables

### Symptom

After adding new `lab_results` columns (`test_date`, `laboratory`, `patient_name`) to
`db/schema.sql`, the repository round-trip tests failed with
`column "test_date" of relation "lab_results" does not exist` — the database still had
the old column set.

### Cause

`db/schema.sql` uses `CREATE TABLE IF NOT EXISTS`. On an already-initialized database the
table exists, so the new columns are never added, even though `scripts/init-db.ts`
re-applies the whole schema file.

### Solution

Follow every `CREATE TABLE IF NOT EXISTS` that can evolve with idempotent upgrades, e.g.:

```sql
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS test_date    DATE;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS laboratory   TEXT;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS patient_name TEXT;
```

Because `ADD COLUMN IF NOT EXISTS` is a no-op when the column already exists, running
`npm run db:init` on both fresh and existing databases is safe and idempotent.

### Prevention

When changing a table shape, add the corresponding `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
lines to `db/schema.sql`, then re-run `npm run db:init` (and `npm test`) before committing.

### Related Task

TASK-002 (LLM OCR).

### JSON Concurrent Write Problems

If multiple requests can write the same JSON file concurrently, naive read-modify-write logic can lose updates.

For the MVP:

- Keep writes server-side.
- Centralize writes in the repository.
- Serialize writes where necessary.
- Add tests for concurrent mutation behavior.

For multi-instance production use, migrate to a transactional database rather than relying on increasingly complex JSON locking.

### Time-Series Timestamp Errors

Always distinguish:

- measurement time
- record creation time
- record update time

Never use upload time as the laboratory test date when the report contains an explicit test date.
