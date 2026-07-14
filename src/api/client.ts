import type {
  Blob,
  BlobCreateResponse,
  BlobHistoryEntry,
  BlobVersionCompareResult,
  CreateBlobRequest,
  JsonCompareResult,
  PatchBlobRequest,
  UpdateBlobRequest,
} from "./types";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  "https://json-blob-api.anandmohan673.workers.dev";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
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
  history: (id: string) => api<BlobHistoryEntry[]>(`/blobs/${id}/history`),
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

export { API_BASE };
