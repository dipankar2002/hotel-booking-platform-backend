import { nanoid } from "nanoid";
import pool from "../db/db.js";
import { bookingSchema } from "../zod/booking.zod.js";

export const bookingRooms = async (req, res) => {
  const client = await pool.connect(); // for transaction
  try {
    const userId = req.user.id;
    const { data, success, error } = bookingSchema.safeParse(req.body);
    if(!success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "INVALID_REQUEST",
      });
    }

    const { roomId, checkInDate, checkOutDate, guests } = data;
    // Get room
    const roomRes = await client.query("SELECT * FROM rooms WHERE id = $1", [
      roomId,
    ]);

    if(roomRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: "ROOM_NOT_FOUND",
      });
    }

    const room = roomRes.rows[0];

    // Get hotel (for owner check)
    const hotelRes = await client.query(
      "SELECT owner_id FROM hotels WHERE id = $1",
      [room.hotel_id],
    );

    const hotel = hotelRes.rows[0];
    // Owner cannot book own hotel
    if(hotel.owner_id === userId) {
      return res.status(403).json({
        success: false,
        data: null,
        error: "FORBIDDEN",
      });
    }

    // Date validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if(checkIn <= today) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "INVALID_DATES",
      });
    }

    if(checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "INVALID_REQUEST",
      });
    }

    // Capacity check
    if(guests > room.max_occupancy) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "INVALID_CAPACITY",
      });
    }

    // Start transaction
    await client.query("BEGIN");

    // Check overlapping bookings
    const bookingRes = await client.query(
      `SELECT * FROM bookings 
        WHERE room_id = $1 AND status = 'confirmed'`,
      [roomId],
    );

    for(let b of bookingRes.rows) {
      const existingCheckIn = new Date(b.check_in_date);
      const existingCheckOut = new Date(b.check_out_date);

      const hasOverlap = checkIn < existingCheckOut && checkOut > existingCheckIn;

      if(hasOverlap) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          data: null,
          error: "ROOM_NOT_AVAILABLE",
        });
      }
    }

    // Calculate price
    const nights = (checkOut - checkIn) / (1000 * 60 * 60 * 24);

    const totalPrice = nights * room.price_per_night;

    // Insert booking
    const bookingId = `booking_${nanoid(10)}`;

    const insertRes = await client.query(
      `INSERT INTO bookings 
        (id, user_id, room_id, hotel_id, check_in_date, check_out_date, guests, total_price)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
      [
        bookingId,
        userId,
        roomId,
        room.hotel_id,
        checkInDate,
        checkOutDate,
        guests,
        totalPrice,
      ],
    );

    // Commit
    await client.query("COMMIT");

    const booking = insertRes.rows[0];

    return res.status(201).json({
      success: true,
      data: {
        id: booking.id,
        userId: booking.user_id,
        roomId: booking.room_id,
        hotelId: booking.hotel_id,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        guests: booking.guests,
        totalPrice: Number(booking.total_price),
        status: booking.status,
        bookingDate: booking.booking_date,
      },
      error: null,
    });
  } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR",
        });
    }
};

export const getBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const status = req.query.status || null;

        const result = await pool.query(
        `
            SELECT 
                b.id,
                b.room_id,
                b.hotel_id,
                h.name AS hotel_name,
                r.room_number,
                r.room_type,
                b.check_in_date,
                b.check_out_date,
                b.guests,
                b.total_price,
                b.status,
                b.booking_date
            FROM bookings b
            JOIN hotels h ON b.hotel_id = h.id
            JOIN rooms r ON b.room_id = r.id

            WHERE b.user_id = $1
            AND ($2::text IS NULL OR LOWER(b.status) = LOWER($2::text))
        `, 
            [userId, status]
        );

        // Map response
        const bookings = result.rows.map((b) => ({
            id: b.id,
            roomId: b.room_id,
            hotelId: b.hotel_id,
            hotelName: b.hotel_name,
            roomNumber: b.room_number,
            roomType: b.room_type,
            checkInDate: b.check_in_date,
            checkOutDate: b.check_out_date,
            guests: b.guests,
            totalPrice: Number(b.total_price),
            status: b.status,
            bookingDate: b.booking_date
        }));

        return res.status(200).json({
            success: true,
            data: bookings,
            error: null
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR",
        });
    }
}

export const cancelBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        const bookingId = req.params.bookingId;

        // Get booking
        const bookingRes = await pool.query(
          ` 
            SELECT user_id, status, check_in_date 
            FROM bookings WHERE id = $1
          `,
            [bookingId]
        );

        if(bookingRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                data: null,
                error: "BOOKING_NOT_FOUND"
            });
        }

        const booking = bookingRes.rows[0];

        // Check ownership
        if(booking.user_id !== userId) {
            return res.status(403).json({
                success: false,
                data: null,
                error: "FORBIDDEN"
            });
        }

        // Already cancelled
        if(booking.status === "cancelled") {
            return res.status(400).json({
                success: false,
                data: null,
                error: "ALREADY_CANCELLED"
            });
        }

        // Check 24-hour rule
        const now = new Date();
        const checkIn = new Date(booking.check_in_date);

        const hoursLeft = (checkIn - now) / (1000 * 60 * 60);

        if(hoursLeft <= 24) {
            return res.status(400).json({
                success: false,
                data: null,
                error: "CANCELLATION_DEADLINE_PASSED"
            });
        }

        // Update booking
        const updateRes = await pool.query(
        `
            UPDATE bookings 
            SET status = 'cancelled', cancelled_at = NOW()
            WHERE id = $1
            RETURNING id, status, cancelled_at
        `,
            [bookingId]
        );

        const updated = updateRes.rows[0];

        return res.status(200).json({
            success: true,
            data: {
                id: updated.id,
                status: updated.status,
                cancelledAt: new Date(updated.cancelled_at).toISOString()
            },
            error: null
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR",
        });
    }
}