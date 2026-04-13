const jwt = require('jsonwebtoken');
const User = require('../../modules/auth/user.model');

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: "Chưa đăng nhập" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: "User không tồn tại" });
        }

        req.user = user;

        next();
    } catch (err) {
        res.status(403).json({ message: "Token không hợp lệ" });
    }
};

module.exports = { verifyToken };