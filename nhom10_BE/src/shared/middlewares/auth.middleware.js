    const jwt = require('jsonwebtoken');
    const User = require('../../../models/user');

    const verifyToken = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ message: "Chưa đăng nhập" });
            }

            const token = authHeader.split(' ')[1];
            console.log(token);
            // Dùng secret cố định để test nếu biến môi trường chưa load kịp
            const secret = process.env.JWT_SECRET || "SmartCity_Nhom10_Secret_Key_2026";
            
            const decoded = jwt.verify(token, secret);
            const user = await User.findById(decoded.id);

            if (!user) return res.status(404).json({ message: "User không tồn tại" });

            // 👉 PHẢI CÓ 2 DÒNG NÀY THÌ MỚI CHẠY ĐƯỢC
            req.user = user;
            next(); 

        } catch (error) {
            console.error("VERIFY TOKEN ERROR:", error.message);
            return res.status(403).json({ success: false, message: "Token không hợp lệ hoặc hết hạn" });
        }
    };
    
    module.exports = { verifyToken };