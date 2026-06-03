const jwt = require('jsonwebtoken');
const User = require('../models/user');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Chua dang nhap" });
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || "SmartCity_Nhom10_Secret_Key_2026";

        const decoded = jwt.verify(token, secret);
        const user = await User.findById(decoded.id);

        if (!user) return res.status(404).json({ message: "User khong ton tai" });
        if (user.isDeleted) {
            return res.status(403).json({ success: false, message: "Tai khoan da bi xoa" });
        }
        if (user.isLocked) {
            return res.status(403).json({ success: false, message: "Tai khoan dang bi khoa" });
        }
        if (!user.currentToken || user.currentToken !== token) {
            return res.status(403).json({ success: false, message: "Phien dang nhap da het hieu luc" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("VERIFY TOKEN ERROR:", error.message);
        return res.status(403).json({ success: false, message: "Token khong hop le hoac het han" });
    }
};

module.exports = { verifyToken };
