const mongoose = require('mongoose');
const path = require('path');
const process = require('process');

// Nạp file config dựa trên môi trường hiện tại
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '../../../config/config.json'))[env];
console.log('Cấu hình hiện tại:', config); // Thêm dòng này để kiểm tra
const connectMongoDB = async () => {
    try {
        // Lấy URI từ file config.json chúng ta vừa sửa
        const mongoURI = config.mongodb_url;

        await mongoose.connect(mongoURI);
        console.log('🍃 [MongoDB]: Kết nối thành công!');
    } catch (err) {
        console.error('❌ [MongoDB]: Lỗi kết nối:', err.message);
        process.exit(1);
    }
};

module.exports = connectMongoDB;