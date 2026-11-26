import { createHash } from "node:crypto";
import { pool } from "../config/database.js";
import {
  storeEncryptedSignature,
  readEncryptedSignature,
  deleteEncryptedSignature,
} from "./signature-storage.service.js";

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024;

export interface SignatureMetadata {
  signatureId: string;
  mimeType: "image/png" | "image/jpeg";
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredSignature extends SignatureMetadata {
  storageKey: string;
}

function validateImage(image: Buffer, mimeType: string) {
  if (image.length === 0 || image.length > MAX_SIGNATURE_SIZE) {
    throw new Error("Signature image must not exceed 2 MB.");
  }

  const isPng =
    image.length >= 8 &&
    image.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );

  const isJpeg =
    image.length >= 3 &&
    image[0] === 0xff &&
    image[1] === 0xd8 &&
    image[2] === 0xff;

  if (
    (mimeType === "image/png" && !isPng) ||
    (mimeType === "image/jpeg" && !isJpeg)
  ) {
    throw new Error("The uploaded image does not match its file type.");
  }

  if (!isPng && !isJpeg) {
    throw new Error("Only PNG and JPEG signature images are supported.");
  }
}

function mapMetadata(row: StoredSignature): SignatureMetadata {
  return {
    signatureId: row.signatureId,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getUserSignature(userId: string) {
  const result = await pool.query<StoredSignature>(
    `
    SELECT
      signature_id::text AS "signatureId",
      storage_key AS "storageKey",
      mime_type AS "mimeType",
      file_size::int AS "fileSize",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM user_signatures
    WHERE user_id = $1
      AND is_active = TRUE
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function saveUserSignature(
  userId: string,
  image: Buffer,
  mimeType: string,
) {
  validateImage(image, mimeType);

  const fileHash = createHash("sha256").update(image).digest("hex");

  const existing = await getUserSignature(userId);

  const encrypted = await storeEncryptedSignature(image);

  try {
    const result = await pool.query<StoredSignature>(
      `
      INSERT INTO user_signatures (
        user_id,
        storage_key,
        mime_type,
        file_size,
        file_hash,
        is_active,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET
        storage_key = EXCLUDED.storage_key,
        mime_type = EXCLUDED.mime_type,
        file_size = EXCLUDED.file_size,
        file_hash = EXCLUDED.file_hash,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        signature_id::text AS "signatureId",
        storage_key AS "storageKey",
        mime_type AS "mimeType",
        file_size::int AS "fileSize",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        userId,
        encrypted.storageKey,
        mimeType,
        encrypted.fileSize,
        fileHash,
      ],
    );

    if (existing && existing.storageKey !== encrypted.storageKey) {
      await deleteEncryptedSignature(existing.storageKey).catch((error) => {
        console.error("Old signature file cleanup failed:", error);
      });
    }

    return mapMetadata(result.rows[0]);
  } catch (error) {
    await deleteEncryptedSignature(encrypted.storageKey).catch(() => {});
    throw error;
  }
}

export async function getUserSignatureImage(userId: string) {
  const signature = await getUserSignature(userId);

  if (!signature) {
    return null;
  }

  const image = await readEncryptedSignature(signature.storageKey);

  return {
    image,
    mimeType: signature.mimeType,
  };
}

export async function removeUserSignature(userId: string) {
  const signature = await getUserSignature(userId);

  if (!signature) {
    return false;
  }

  const result = await pool.query(
    `
    DELETE FROM user_signatures
    WHERE user_id = $1
      AND is_active = TRUE
    `,
    [userId],
  );

  if (result.rowCount && result.rowCount > 0) {
    await deleteEncryptedSignature(signature.storageKey).catch((error) => {
      console.error("Signature file cleanup failed:", error);
    });

    return true;
  }

  return false;
}