export interface Blob {
  id: string;
  key: string;
  name: string;
  data: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
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
  key?: string;
}

export interface UpdateBlobRequest {
  name: string;
  data: Record<string, unknown>;
}

export interface PatchBlobRequest {
  name?: string;
  data?: Record<string, unknown>;
}

export interface CompareJsonRequest {
  left: unknown;
  right: unknown;
}

export interface ApiError {
  error: string;
}
