
import express from "express";
import { authMiddleware, customerOnly } from "../middlewares/middlewares.js";
import { createReview } from "../controllers/review.controller.js";

const router = express.Router();

router.post("/", authMiddleware, customerOnly, createReview);

export default router;