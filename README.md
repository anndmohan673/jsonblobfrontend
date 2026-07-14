# JSON Blob Frontend

Vite + React UI for the JSON Blob API.

## Setup

```bash
npm install
cp .env.example .env   # defaults to http://localhost:8787
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

The API should be running locally on port `8788`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |

## Features

- List / search blobs
- Create blob (name, optional key, JSON body)
- Edit with **Save** (PUT full replace) or **Patch** (PATCH deep merge)
- Version history picker (load a snapshot into the editor)
- Delete blob
- Live API health indicator
