import z from "zod";

export const createHotelSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  city: z.string().min(2),
  country: z.string().min(2),
  amenities: z.array(z.string().min(1)).min(1)
});

export const addRoomSchema = z.object({
  roomNumber: z.string().min(1),
  roomType: z.string().min(1),
  pricePerNight: z.coerce.number().positive(), // pricePerNight: z.coerce.number().positive(),
  maxOccupancy: z.coerce.number().int().positive()
})