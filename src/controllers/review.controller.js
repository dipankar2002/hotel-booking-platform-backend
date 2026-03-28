import pool from "../db/db.js";
import { nanoid } from "nanoid";
import { reviewSchema } from "../zod/review.zod.js";

export const createReview = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;
        await client.query("BEGIN");

        // Validate body
        const { data, success } = reviewSchema.safeParse(req.body);
        if(!success) {
            return res.status(400).json({
                success: false,
                data: null,
                error: "INVALID_REQUEST"
            });
        }

        const { bookingId, rating, comment } = data;

        // Get booking
        const bookingRes = await client.query(
            `
                SELECT user_id, hotel_id, check_out_date, status 
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

        // Ownership check
        if(booking.user_id !== userId) {
            return res.status(403).json({
                success: false,
                data: null,
                error: "FORBIDDEN"
            });
        }

        // Already reviewed
        const reviewCheck = await client.query(
            "SELECT id FROM reviews WHERE booking_id = $1",
            [bookingId]
        );

        if(reviewCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                data: null,
                error: "ALREADY_REVIEWED"
            });
        }

        // Check eligibility (checkout passed & confirmed)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkOut = new Date(booking.check_out_date);

        if(!(checkOut < today && booking.status === "confirmed")) {
            return res.status(400).json({
                success: false,
                data: null,
                error: "BOOKING_NOT_ELIGIBLE"
            });
        }

        // Insert review
        const reviewId = `review_${nanoid(10)}`;

        const insertRes = await client.query(
            `INSERT INTO reviews 
            (id, user_id, hotel_id, booking_id, rating, comment)
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING *`,
            [
                reviewId,
                userId,
                booking.hotel_id,
                bookingId,
                rating,
                comment || null
            ]
        );

        const review = insertRes.rows[0];

        // Update hotel rating
        const hotelRes = await client.query(
            "SELECT rating, total_reviews FROM hotels WHERE id = $1",
            [booking.hotel_id]
        );

        const hotel = hotelRes.rows[0];

        const newTotalReviews = hotel.total_reviews + 1;

        const newRating = Number(
            (((hotel.rating * hotel.total_reviews) + rating) / newTotalReviews).toFixed(1)
        );

        await client.query(
            `UPDATE hotels 
            SET rating = $1, total_reviews = $2
            WHERE id = $3`,
            [newRating, newTotalReviews, booking.hotel_id]
        );

        await client.query("COMMIT");
        // Response
        return res.status(201).json({
            success: true,
            data: {
                id: review.id,
                userId: review.user_id,
                hotelId: review.hotel_id,
                bookingId: review.booking_id,
                rating: Number(review.rating),
                comment: review.comment,
                createdAt: new Date(review.created_at).toISOString()
            },
            error: null
        });
    } catch (error) {
        console.error(error);
        await client.query("ROLLBACK");
        return res.status(500).json({
        success: false,
        data: null,
        error: "INTERNAL_SERVER_ERROR"
        });
    } finally {
        client.release();
    }
};