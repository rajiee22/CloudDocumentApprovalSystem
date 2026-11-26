const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface SignatureMetadata {
  signatureId: string;
  mimeType: "image/png" | "image/jpeg";
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

interface SignatureResponse {
  success: boolean;
  message?: string;
  signature: SignatureMetadata | null;
}

export class SignatureApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "SignatureApiError";
  }
}

async function signatureRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}/api/signatures${endpoint}`,
    {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new SignatureApiError(
      data?.message || "Signature request failed.",
      response.status,
    );
  }

  return data as T;
}

export async function getMySignature(): Promise<SignatureMetadata | null> {
  const data = await signatureRequest<SignatureResponse>("/me");

  return data.signature;
}

export async function saveMySignature(
  mimeType: "image/png" | "image/jpeg",
  imageBase64: string,
): Promise<SignatureMetadata> {
  const data = await signatureRequest<{
    success: boolean;
    message: string;
    signature: SignatureMetadata;
  }>("/me", {
    method: "POST",
    body: JSON.stringify({
      mimeType,
      image: imageBase64,
    }),
  });

  return data.signature;
}

export async function getMySignatureImage(): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/signatures/me/image`,
    {
      credentials: "include",
      headers: {
        Accept: "image/png, image/jpeg",
      },
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new SignatureApiError(
      data?.message || "Unable to retrieve signature image.",
      response.status,
    );
  }

  return response.blob();
}

export async function removeMySignature(): Promise<void> {
  await signatureRequest("/me", {
    method: "DELETE",
  });
}