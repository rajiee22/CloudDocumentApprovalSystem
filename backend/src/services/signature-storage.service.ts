import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const encryptionKeyText = process.env.SIGNATURE_ENCRYPTION_KEY;

if (!encryptionKeyText) {
  throw new Error("SIGNATURE_ENCRYPTION_KEY is not configured.");
}

const encryptionKey = Buffer.from(encryptionKeyText, "base64");

if (
  encryptionKey.length !== 32 ||
  encryptionKey.toString("base64") !== encryptionKeyText
) {
  throw new Error(
    "SIGNATURE_ENCRYPTION_KEY must be a valid base64-encoded 32-byte key.",
  );
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const signatureDirectory = path.resolve(
  currentDirectory,
  "../../secure-storage/signatures",
);

const FILE_MAGIC = Buffer.from("CDAS");
const FILE_VERSION = 1;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const HEADER_LENGTH = FILE_MAGIC.length + 1 + IV_LENGTH + AUTH_TAG_LENGTH;

export interface EncryptedSignatureResult {
  storageKey: string;
  fileHash: string;
  fileSize: number;
}

export async function storeEncryptedSignature(
  image: Buffer,
): Promise<EncryptedSignatureResult> {
  if (image.length === 0 || image.length > 5 * 1024 * 1024) {
    throw new Error("Signature image must be between 1 byte and 5 MB.");
  }

  await mkdir(signatureDirectory, { recursive: true });

  const storageKey = `${randomBytes(16).toString("hex")}.dat`;
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);

  const ciphertext = Buffer.concat([
    cipher.update(image),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  const encryptedFile = Buffer.concat([
    FILE_MAGIC,
    Buffer.from([FILE_VERSION]),
    iv,
    authTag,
    ciphertext,
  ]);

  const filePath = path.join(signatureDirectory, storageKey);

  await writeFile(filePath, encryptedFile, { flag: "wx" });

  return {
    storageKey,
    fileHash: createHash("sha256").update(image).digest("hex"),
    fileSize: image.length,
  };
}

export async function readEncryptedSignature(
  storageKey: string,
): Promise<Buffer> {
  if (!/^[a-f0-9]{32}\.dat$/.test(storageKey)) {
    throw new Error("Invalid signature storage key.");
  }

  const filePath = path.join(signatureDirectory, storageKey);
  const encryptedFile = await readFile(filePath);

  if (
    encryptedFile.length <= HEADER_LENGTH ||
    !encryptedFile.subarray(0, 4).equals(FILE_MAGIC)
  ) {
    throw new Error("Invalid encrypted signature file.");
  }

  const version = encryptedFile[4];

  if (version !== FILE_VERSION) {
    throw new Error("Unsupported signature encryption version.");
  }

  const ivStart = 5;
  const tagStart = ivStart + IV_LENGTH;
  const ciphertextStart = tagStart + AUTH_TAG_LENGTH;

  const iv = encryptedFile.subarray(ivStart, tagStart);
  const authTag = encryptedFile.subarray(tagStart, ciphertextStart);
  const ciphertext = encryptedFile.subarray(ciphertextStart);

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
}

export async function deleteEncryptedSignature(
  storageKey: string,
): Promise<void> {
  if (!/^[a-f0-9]{32}\.dat$/.test(storageKey)) {
    throw new Error("Invalid signature storage key.");
  }

  await unlink(path.join(signatureDirectory, storageKey));
}