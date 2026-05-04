const multer = require('multer');

// 👉 lưu file vào RAM (buffer)
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;