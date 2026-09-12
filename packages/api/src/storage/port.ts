export type StorageObjectBody = ReadableStream | ArrayBuffer | Uint8Array;

export type StorageGetResult = {
  body: ReadableStream;
  contentType?: string;
  size?: number;
};

export type StoragePutOptions = {
  contentType?: string;
  size?: number;
};

export type StoragePresignOptions = {
  expiresIn?: number;
  downloadName?: string;
};

export interface StoragePort {
  readonly bucket: string;
  put(key: string, body: StorageObjectBody, opts?: StoragePutOptions): Promise<void>;
  get(key: string): Promise<StorageGetResult | null>;
  delete(key: string): Promise<void>;
  presignGet(key: string, opts?: StoragePresignOptions): Promise<string>;
}

export type DocumentObjectKeyInput = {
  companyId?: string;
  caseId?: string;
  documentId: string;
  version: number;
  fileName: string;
};

function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "");
  return cleaned.length > 0 ? cleaned : "document";
}

export function documentObjectKey(input: DocumentObjectKeyInput): string {
  const fileName = sanitizeFileName(input.fileName);

  let owner: string;
  if (input.companyId) {
    owner = `companies/${input.companyId}`;
  } else if (input.caseId) {
    owner = `cases/${input.caseId}`;
  } else {
    throw new Error("documentObjectKey requires a companyId or a caseId");
  }

  return `${owner}/documents/${input.documentId}/v${input.version}/${fileName}`;
}
