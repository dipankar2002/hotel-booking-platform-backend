import { decodeToken } from "../utils/jwt.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                data: null,
                error: "UNAUTHORIZED"
            });
        }
        const token = authHeader.split(" ")[1];
        const tokenData = decodeToken(token);
        req.user = { id: tokenData.id, role: tokenData.role };
        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR"
        });
    }
}

export const ownerOnlyMiddle = async (req, res, next) => {
    try {
        const role = req.user.role;
        if(role !== "owner") {
            return res.status(403).json({
                "success": false,
                "data": null,
                "error": "FORBIDDEN"
            })
        }
        next();

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR"
        });
    }
}

export const customerOnly = async (req, res, next) => {
    try {
        const role = req.user.role;
        if (role !== "customer") {
            return res.status(403).json({
                success: false,
                data: null,
                error: "FORBIDDEN"
            });
        }
        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR"
        }); 
    }
}