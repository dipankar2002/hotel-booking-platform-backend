
import express from "express";
import { authMiddleware, customerOnly } from "../middlewares/middlewares.js";
import { bookingRooms, cancelBooking, getBookings } from "../controllers/booking.controller.js";

const router = express.Router();

router.post("/", authMiddleware, customerOnly, bookingRooms);
router.get("/", authMiddleware, customerOnly, getBookings);
router.put("/:bookingId/cancel", authMiddleware, customerOnly, cancelBooking);

export default router;