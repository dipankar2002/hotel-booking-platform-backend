import pool from "../db/db.js";
import { nanoid } from "nanoid";
import { loginSchema, signupSchema } from "../zod/auth.zod.js";
import { comparePassword, hashedPassword } from "../utils/hashPass.js";
import { createToken } from "../utils/jwt.js";


export const login = async (req, res) => {
    try {
        const { data, success, error } = loginSchema.safeParse(req.body);
        if(!success) {
            return res.status(400).json({
                "success": false,
                "data": null,
                "error": "INVALID_REQUEST"
            })
        }

        const { email, password } = data;
        const userResult = await pool.query( "SELECT id, name, email, password, role FROM users WHERE email = $1", [email] );
        
        if(userResult.rows.length === 0) {
            return res.status(401).json({
                "success": false,
                "data": null,
                "error": "INVALID_CREDENTIALS"
            })
        }
        const hashedPass = userResult.rows[0].password;
        const validPassword = await comparePassword(password, hashedPass);
        if(!validPassword) {
            return res.status(401).json({
                "success": false,
                "data": null,
                "error": "INVALID_CREDENTIALS"
            })
        }
        
        const JWT_TOKEN = createToken({ 
            id: userResult.rows[0].id, 
            role: userResult.rows[0].role
        });

        return res.status(200).json({
            "success": true,
            "data": {
                token: JWT_TOKEN,
                user: {
                    id: userResult.rows[0].id,
                    name: userResult.rows[0].name,
                    email: userResult.rows[0].email,
                    role: userResult.rows[0].role
                }
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

export const signup = async (req, res) => {
    try {
        const { data, success, error } = signupSchema.safeParse(req.body);
        if(!success) {
            return res.status(400).json({
                success: false,
                data: null,
                error: "INVALID_REQUEST"
            });
        }

        const { name, email, password, role = "customer", phone } = data;
    
        const emailCheck = await pool.query( "SELECT id FROM users WHERE email = $1", [email] )
        if(emailCheck.rows.length > 0) {
            return res.status(400).json({
                "success": false,
                "data": null,
                "error": "EMAIL_ALREADY_EXISTS"
            })
        }

        const hashPass = await hashedPassword(password);
        const userId = `usr_${nanoid(10)}`;

        await pool.query(
            `INSERT INTO users (id, name, email, password, role, phone)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, name, email, hashPass, role, phone || null]
        );

        return res.status(201).json({
            "success": true,
            "data": {
                id: userId,
                name,
                email,
                role,
                phone: phone || null
            },
            "error": null
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR"
        });
    }
}