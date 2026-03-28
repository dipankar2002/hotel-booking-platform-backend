import { nanoid } from "nanoid";
import pool from "../db/db.js";
import { addRoomSchema, createHotelSchema } from "../zod/hotel.zod.js";


export const getHotelInfo = async (req, res) => {
    try {
        const hotelId = req.params.hotelId;
        const searchHotelRes = await pool.query(
            "SELECT * FROM hotels WHERE id = $1",
            [hotelId]
        )
        if(searchHotelRes.rows.length === 0) {
            return res.status(404).json({
                "success": false,
                "data": null,
                "error": "HOTEL_NOT_FOUND"
            })
        }
        const searchRoomRes = await pool.query(
            `SELECT id, room_number, room_type, price_per_night, max_occupancy FROM rooms WHERE hotel_id = $1`,
            [hotelId]
        )

        const { id, owner_id, name, description, city, country, amenities, rating, total_reviews } = searchHotelRes.rows[0];
        const rooms = searchRoomRes.rows.map(room => ({ 
            id:room.id, 
            roomNumber:room.room_number, 
            roomType:room.room_type, 
            pricePerNight:room.price_per_night, 
            maxOccupancy: room.max_occupancy 
        }));
        return res.status(200).json({
            "success": true,
            "data": {
                id: id,
                ownerId: owner_id,
                name: name,
                description: description,
                city: city,
                country: country,
                amenities: amenities,
                rating: rating,
                totalReviews: total_reviews,
                rooms: rooms
            },
            "error": null
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR"
        });
    }
}
export const searchHotel = async (req, res) => {
    try {
        const city = req.query.city || '';
        const country = req.query.country || '';
        const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
        const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
        const minRating = req.query.minRating ? Number(req.query.minRating) : null;

        const searchResult = await pool.query(
        `
            SELECT h.id,h.name,h.description,h.city,h.country,h.amenities,h.rating,h.total_reviews,
            MIN(r.price_per_night) AS min_price_per_night

            FROM hotels h
            JOIN rooms r ON h.id = r.hotel_id

            WHERE ($1 = '' OR LOWER(h.city)=LOWER($1))
            AND ($2 = '' OR LOWER(h.country)=LOWER($2))

            AND ($3::numeric IS NULL OR h.rating >= $3::numeric)
            AND ($4::numeric IS NULL OR r.price_per_night >= $4::numeric)
            AND ($5::numeric IS NULL OR r.price_per_night <= $5::numeric)

            GROUP BY h.id,h.name,h.description,h.city,h.country,h.amenities,h.rating,h.total_reviews
            `,
            [city, country, minRating, minPrice, maxPrice]
        );
        const hotels = searchResult.rows.map(h => ({
            id: h.id,
            name: h.name,
            description: h.description,
            city: h.city,
            country: h.country,
            amenities: h.amenities,
            rating: h.rating,
            totalReviews: h.total_reviews,
            minPricePerNight: Number(h.min_price_per_night)
        }));
        
        return res.status(200).json({
            "success": true,
            "data": hotels,
            "error": null
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR"
        });
    }
}
export const addRoomToHotel = async (req, res) => {
    try {
        const hotelId = req.params.hotelId;
        const ownerId = req.user.id;

        const { data, success, error } = addRoomSchema.safeParse(req.body);
        if(!success) {
            return res.status(400).json({
                "success": false,
                "data": null,
                "error": "INVALID_REQUEST"
            })
        }

        const hotelResult = await pool.query(
            "SELECT * FROM hotels WHERE id = $1",
            [hotelId]
        )
        if(hotelResult.rows.length === 0) {
            return res.status(404).json({
                "success": false,
                "data": null,
                "error": "HOTEL_NOT_FOUND"
            })
        }
        if(hotelResult.rows[0].owner_id !== ownerId) {
            return res.status(403).json({
                "success": false,
                "data": null,
                "error": "FORBIDDEN"
            })
        }

        const { roomNumber, roomType, pricePerNight, maxOccupancy } = data;
        const roomCheck = await pool.query(
            `SELECT id FROM rooms WHERE hotel_id = $1 AND room_number = $2`,
            [ hotelId, roomNumber ]
        )
        if(roomCheck.rows.length > 0) {
            return res.status(400).json({
                "success": false,
                "data": null,
                "error": "ROOM_ALREADY_EXISTS"
            })
        }
        const roomId = `rm_${nanoid(10)}`;
        const roomResult = await pool.query(
            `INSERT INTO rooms (id, hotel_id, room_number, room_type, price_per_night, max_occupancy) 
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [ roomId, hotelId, roomNumber, roomType, pricePerNight, maxOccupancy ]
        )
        return res.status(201).json({
            "success": true,
            "data": {
                id: roomResult.rows[0].id,
                hotelId: roomResult.rows[0].hotel_id,
                roomNumber: roomResult.rows[0].room_number,
                roomType: roomResult.rows[0].room_type,
                pricePerNight: roomResult.rows[0].price_per_night,
                maxOccupancy: roomResult.rows[0].max_occupancy,
            },
            "error": null
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR"
        });
    }
}
export const createHotel = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const { data, success, error } = createHotelSchema.safeParse(req.body);
        if(!success) {
            return res.status(400).json({
                "success": false,
                "data": null,
                "error": "INVALID_REQUEST"
            })
        }
        const { name, description, city, country, amenities } = data;
        const hotelId = `hotl_${nanoid(10)}`;
        const hotelResult = await pool.query(
            `INSERT INTO hotels (id, owner_id, name, description, city, country, amenities) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [ hotelId, ownerId, name, description, city, country, JSON.stringify(amenities) ]
        );

        return res.status(201).json({
            "success": true,
            "data": {
                id: hotelId,
                ownerId,
                name,
                description,
                city,
                country,
                amenities,
                rating: hotelResult.rows[0].rating,
                totalReviews: hotelResult.rows[0].total_reviews
            },
            "error": null
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR"
        });
    }
}