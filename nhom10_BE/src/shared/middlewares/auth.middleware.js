const jwt = require('jsonwebtoken');
<<<<<<< HEAD
const User = require('../../modules/auth/user.model');
=======
const  User  = require('../../../models/user'); // Đường dẫn trỏ đến file models/index.js (thay đổi số lượng ../ cho đúng với thư mục máy bạn)
>>>>>>> toan

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: "Chưa đăng nhập" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

<<<<<<< HEAD
=======
        // 4. [QUAN TRỌNG] Truy vấn CSDL để lấy thông tin mới nhất của User
        // DÒNG ĐÃ SỬA (Chuẩn Mongoose):
>>>>>>> toan
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: "User không tồn tại" });
        }

        req.user = user;

        next();
<<<<<<< HEAD
    } catch (err) {
        res.status(403).json({ message: "Token không hợp lệ" });
=======
    } catch (error) {
        console.error(error);
        return res.status(403).json({
            success: false,
            message: "Phiên đăng nhập hết hạn hoặc thẻ không hợp lệ!"
        });
>>>>>>> toan
    }
};

module.exports = { verifyToken };