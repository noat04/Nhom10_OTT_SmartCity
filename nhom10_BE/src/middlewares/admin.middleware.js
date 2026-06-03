const User = require('../models/user');

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user?.id && !req.user?._id) {
      return res.status(401).json({ success: false, message: 'Chua dang nhap' });
    }

    const user = await User.findById(req.user.id || req.user._id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Khong co quyen admin' });
    }

    req.admin = user;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Khong xac thuc duoc admin' });
  }
};

module.exports = { requireAdmin };
