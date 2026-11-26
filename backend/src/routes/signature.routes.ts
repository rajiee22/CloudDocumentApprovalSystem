import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";

import {
  getMySignatureController,
  saveMySignatureController,
  getMySignatureImageController,
  removeMySignatureController,
} from "../controllers/signature.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMySignatureController);

router.post("/me", saveMySignatureController);

router.get("/me/image", getMySignatureImageController);

router.delete("/me", removeMySignatureController);

export default router;