# JSON Blob API — Frontend Integration Overview

REST API for storing versioned JSON documents (“blobs”). Built on Cloudflare Workers + Hono + D1.

**HTTP methods:** only `GET` and `POST` (no `PUT`, `PATCH`, or `DELETE`). Mutations use action paths (`/update`, `/patch`, `/delete`).

CORS is enabled for all origins (`*`); allowed methods are `GET`, `POST`, `OPTIONS`, and `HEAD`. No authentication in v1.

---

## Local development

Requires **Node.js 22+** (Wrangler 4.110). This repo includes an `.nvmrc`.

D1 is configured with `"remote": true`, so `npm run dev` writes to your **Cloudflare D1** database (visible in D1 Studio). Changes are real.

```bash
nvm use          # switches to Node 22
node -v          # should print v22.x
npm install
npm run db:migrate:remote  # first time / after schema changes
npm run dev                # uses remote D1
```

For a disposable local SQLite DB instead:

```bash
npm run db:migrate:local
npm run dev:local-db
```

If you previously ran an older global Wrangler and see a `_cf_ALARM` / SQLite error, delete `.wrangler` and re-run migrations, then `npm run dev`.

## Base URL

| Environment | URL |
|-------------|-----|
| Local (`npm run dev`) | `http://127.0.0.1:8787` |
| Production | `https://json-blob-api.<your-subdomain>.workers.dev` (after `npm run deploy`) |

Set this once in your frontend (e.g. `VITE_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL`).

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";
```

---

## TypeScript types (copy into frontend)

```ts
export interface Blob {
  id: string;
  key: string;
  name: string;
  data: Record<string, unknown>;
  version: number;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export interface BlobCreateResponse {
  id: string;
  key: string;
  version: number;
}

export interface BlobHistoryEntry {
  id: string;
  blobId: string;
  version: number;
  name: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export type JsonDiffChange =
  | { path: string; type: "added"; to: unknown }
  | { path: string; type: "removed"; from: unknown }
  | { path: string; type: "changed"; from: unknown; to: unknown };

export interface JsonCompareResult {
  equal: boolean;
  changes: JsonDiffChange[];
  left?: unknown;
  right?: unknown;
}

export interface BlobVersionCompareResult extends JsonCompareResult {
  blobId: string;
  fromVersion: number;
  toVersion: number;
  fromName: string;
  toName: string;
  left: Record<string, unknown>;
  right: Record<string, unknown>;
}

export interface CreateBlobRequest {
  name: string;
  data: Record<string, unknown>;
  key?: string; // optional; auto-slugified from name if omitted
}

export interface UpdateBlobRequest {
  name: string;
  data: Record<string, unknown>;
}

export interface PatchBlobRequest {
  name?: string;
  data?: Record<string, unknown>; // deep-merged into existing data
  // at least one of name | data is required
}

export interface CompareJsonRequest {
  left: unknown;
  right: unknown;
}

export interface ApiError {
  error: string;
}
```

---

## Endpoints at a glance

| Method | Path | Body | Success |
|--------|------|------|---------|
| `GET` | `/health` | — | `200` `{ ok: true }` |
| `POST` | `/blobs` | Create | `201` `{ id, key, version }` |
| `GET` | `/blobs` | — | `200` `Blob[]` |
| `GET` | `/blobs/:id` | — | `200` `Blob` |
| `POST` | `/blobs/:id/update` | Update (full replace) | `200` `Blob` |
| `POST` | `/blobs/:id/patch` | Patch (merge) | `200` `Blob` |
| `POST` | `/blobs/:id/delete` | — | `204` empty body |
| `GET` | `/blobs/:id/history` | — | `200` `BlobHistoryEntry[]` |
| `POST` | `/blobs/compare` | `{ left, right }` | `200` `JsonCompareResult` |
| `GET` | `/blobs/:id/compare?from=&to=` | — | `200` `BlobVersionCompareResult` |

All mutating requests use:

```http
Content-Type: application/json
```

---

## Error format

```json
{ "error": "Blob not found" }
```

| Status | When |
|--------|------|
| `400` | Invalid JSON or Zod validation failed |
| `404` | Blob id not found / unknown route |
| `409` | Could not allocate a unique `key` |
| `500` | Unexpected server error |

---

## Endpoint details

### Health

```http
GET /health
```

```json
{ "ok": true }
```

### Create blob

```http
POST /blobs
```

**Request**

```json
{
  "name": "User Preferences",
  "data": {
    "theme": "dark",
    "language": "en",
    "notifications": true
  }
}
```

Optional `key`:

```json
{
  "name": "Settings",
  "key": "app-settings",
  "data": { "theme": "dark" }
}
```

If `key` is omitted, it is derived from `name` (slug, e.g. `"User Preferences"` → `"user-preferences"`). On collision a short suffix is appended.

**Response `201`**

```json
{
  "id": "7dc87fb7",
  "key": "user-preferences",
  "version": 1
}
```

Store `id` — all later calls use it as `:id`.

### List blobs

```http
GET /blobs
```

Returns full `Blob` objects (including `data`), newest `createdAt` first.

### Get blob

```http
GET /blobs/:id
```

### Full update

Replaces `name` and `data` entirely. Increments `version`.

```http
POST /blobs/:id/update
```

```json
{
  "name": "User Preferences",
  "data": {
    "theme": "light",
    "language": "en",
    "notifications": false
  }
}
```

### Partial update

Deep-merges `data` into the existing object; optional `name` rename. Increments `version`.

```http
POST /blobs/:id/patch
```

```json
{
  "data": {
    "notifications": true
  }
}
```

```json
{
  "name": "User Preferences (Renamed)"
}
```

Arrays and primitives in `data` are replaced (not appended) when the same key is patched.

### History

```http
GET /blobs/:id/history
```

Snapshots in ascending `version` order (every create / update / patch).

```json
[
  {
    "id": "dc7a0a84",
    "blobId": "7dc87fb7",
    "version": 1,
    "name": "User Preferences",
    "data": { "theme": "dark", "language": "en" },
    "createdAt": "2026-07-14T10:02:59.697Z"
  }
]
```

### Compare JSON (ad-hoc)

Deep-compare any two JSON values (objects, arrays, or primitives). Paths use dotted keys and `[index]` for arrays (e.g. `nested.a`, `items[0].name`).

```http
POST /blobs/compare
```

```json
{
  "left": { "theme": "dark", "language": "en" },
  "right": { "theme": "light", "language": "en", "notifications": true }
}
```

**Response `200`**

```json
{
  "left": { "theme": "dark", "language": "en" },
  "right": { "theme": "light", "language": "en", "notifications": true },
  "equal": false,
  "changes": [
    { "path": "theme", "type": "changed", "from": "dark", "to": "light" },
    { "path": "notifications", "type": "added", "to": true }
  ]
}
```

When both sides match: `{ "equal": true, "changes": [], "left": ..., "right": ... }`.

Change `type` values:

| `type` | Meaning |
|--------|---------|
| `added` | Present only on `right` (`to`) |
| `removed` | Present only on `left` (`from`) |
| `changed` | Same path, different value (`from` → `to`) |

### Compare blob versions

Compare two history snapshots of the same blob. `from` and `to` are version numbers from `GET /blobs/:id/history`.

```http
GET /blobs/:id/compare?from=1&to=2
```

**Response `200`**

```json
{
  "blobId": "7dc87fb7",
  "fromVersion": 1,
  "toVersion": 2,
  "fromName": "User Preferences",
  "toName": "User Preferences",
  "left": { "theme": "dark", "language": "en" },
  "right": { "theme": "light", "language": "en", "notifications": true },
  "equal": false,
  "changes": [
    { "path": "theme", "type": "changed", "from": "dark", "to": "light" },
    { "path": "notifications", "type": "added", "to": true }
  ]
}
```

Returns `404` if the blob or either version is missing. Returns `400` if `from` / `to` are missing or not positive integers.

### Delete

```http
POST /blobs/:id/delete
```

`204` with empty body. History is removed with the blob.

---

## Typical frontend flow

```text
1. POST /blobs              → save { id, key, version }
2. GET  /blobs/:id          → render editor
3. POST /blobs/:id/patch    → autosave partial changes (version++)
4. POST /blobs/:id/update   → full save / replace
5. GET  /blobs/:id/history  → version picker / undo UI
6. GET  /blobs/:id/compare?from=1&to=2 → version diff UI
7. POST /blobs/compare      → compare any two JSON payloads
8. POST /blobs/:id/delete   → remove
```

---

## Minimal client helper

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json();
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return body as T;
}

export const blobsApi = {
  health: () => api<{ ok: boolean }>("/health"),
  list: () => api<Blob[]>("/blobs"),
  get: (id: string) => api<Blob>(`/blobs/${id}`),
  create: (body: CreateBlobRequest) =>
    api<BlobCreateResponse>("/blobs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: UpdateBlobRequest) =>
    api<Blob>(`/blobs/${id}/update`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patch: (id: string, body: PatchBlobRequest) =>
    api<Blob>(`/blobs/${id}/patch`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    api<void>(`/blobs/${id}/delete`, { method: "POST" }),
  history: (id: string) =>
    api<BlobHistoryEntry[]>(`/blobs/${id}/history`),
  compare: (left: unknown, right: unknown) =>
    api<JsonCompareResult>("/blobs/compare", {
      method: "POST",
      body: JSON.stringify({ left, right }),
    }),
  compareVersions: (id: string, from: number, to: number) =>
    api<BlobVersionCompareResult>(
      `/blobs/${id}/compare?from=${from}&to=${to}`,
    ),
};
```

Usage:

```ts
const created = await blobsApi.create({
  name: "User Preferences",
  data: { theme: "dark" },
});

const blob = await blobsApi.get(created.id);
await blobsApi.patch(created.id, { data: { theme: "light" } });
const history = await blobsApi.history(created.id);

const adHoc = await blobsApi.compare(
  { theme: "dark" },
  { theme: "light", notifications: true },
);

const versionDiff = await blobsApi.compareVersions(created.id, 1, 2);
```

---

## Postman

Import [`postman/JSON_Blob_API.postman_collection.json`](postman/JSON_Blob_API.postman_collection.json). Variable `baseUrl` defaults to local; Create Blob auto-sets `blobId`.

---

## Notes for UI

- **IDs** are short hex strings (8 chars), e.g. `7dc87fb7`.
- **`key`** is unique and slug-like — useful for friendly URLs if you look up by id only today (`GET` is by `id`, not `key`).
- **`version`** increases on every successful create/write; use it for optimistic UI (“version mismatch”) if needed later.
- **`data`** must be a JSON object (`{}`), not an array or primitive at the top level (create/update/patch). Compare accepts any JSON value for `left` / `right`.
- **Compare** is read-only — it does not create a new version.
- No auth yet — do not expose a production Worker publicly with sensitive data until API keys / JWT are added.
