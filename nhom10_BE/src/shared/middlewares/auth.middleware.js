const jwt = require('jsonwebtoken');
const User = require('../../../models/user');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "Chưa đăng nhập" });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: "Token không hợp lệ" });
        }

        // 🔥 FIX QUAN TRỌNG
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "SmartCity_Nhom10_Secret_Key_2026"
        );

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: "User không tồn tại" });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("VERIFY TOKEN ERROR:", error);
        return res.status(403).json({
            success: false,
            message: "Phiên đăng nhập hết hạn!"
        });
    }
};

module.exports = { verifyToken };