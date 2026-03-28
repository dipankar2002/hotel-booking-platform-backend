import { z } from "zod";

export const bookingSchema = z.object({
  roomId: z.string().min(1),
  checkInDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    { message: "Invalid check-in date" }
  ),
  checkOutDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    { message: "Invalid check-out date" }
  ),
  guests: z.number().int().positive()
});