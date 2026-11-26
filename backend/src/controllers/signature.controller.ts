import type { Request, Response } from "express";
import { z } from "zod";

import {
  getUserSignature,
  getUserSignatureImage,
  saveUserSignature,
  removeUserSignature,
} from "../services/signature.service.js";

const uploadSchema = z.object({
  mimeType: z.enum(["image/png", "image/jpeg"]),
  image: z.string().min(1),
});

export async function getMySignatureController(
  req: Request,
  res: Response,
) {
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const signature = await getUserSignature(user.id);

    return res.status(200).json({
      success: true,
      signature: signature
        ? {
            signatureId: signature.signatureId,
            mimeType: signature.mimeType,
            fileSize: signature.fileSize,
            createdAt: signature.createdAt,
            updatedAt: signature.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Signature retrieval failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve signature.",
    });
  }
}

export async function saveMySignatureController(
  req: Request,
  res: Response,
) {
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  const parsed = uploadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "A valid PNG or JPEG signature image is required.",
    });
  }

  try {
    const image = Buffer.from(parsed.data.image, "base64");

    // Reject invalid or non-canonical Base64 input.
    if (image.toString("base64") !== parsed.data.image) {
      return res.status(400).json({
        success: false,
        message: "Invalid Base64 image data.",
      });
    }

    const signature = await saveUserSignature(
      user.id,
      image,
      parsed.data.mimeType,
    );

    return res.status(200).json({
      success: true,
      message: "Signature saved successfully.",
      signature,
    });
  } catch (error) {
    console.error("Signature saving failed:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to save signature.",
    });
  }
}

export async function getMySignatureImageController(
  req: Request,
  res: Response,
) {
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const result = await getUserSignatureImage(user.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "No saved signature found.",
      });
    }

    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(result.image);
  } catch (error) {
    console.error("Signature image retrieval failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve signature image.",
    });
  }
}

export async function removeMySignatureController(
  req: Request,
  res: Response,
) {
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const removed = await removeUserSignature(user.id);

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: "No saved signature found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Signature removed successfully.",
    });
  } catch (error) {
    console.error("Signature removal failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove signature.",
    });
  }
}