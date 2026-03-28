
import express from "express";
import { authMiddleware, ownerOnlyMiddle } from "../middlewares/middlewares.js";
import { addRoomToHotel, createHotel, getHotelInfo, searchHotel } from "../controllers/hotel.controller.js";

const router = express.Router();

router.post("/", authMiddleware, ownerOnlyMiddle, createHotel);
router.post("/:hotelId/rooms", authMiddleware, ownerOnlyMiddle, addRoomToHotel);
router.get("/", authMiddleware, ownerOnlyMiddle, searchHotel);
router.get("/:hotelId", authMiddleware, ownerOnlyMiddle, getHotelInfo);

export default router;