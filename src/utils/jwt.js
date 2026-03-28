
import jwt from "jsonwebtoken";

export const createToken = (userData) => {
    return jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const decodeToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
}