const mongoose = require('mongoose');
// 1. Phải định nghĩa env trước khi dùng
const env = process.env.NODE_ENV || 'development';
const Message = require('../../models/message');
const config = require(path.join(__dirname, '../../config/config.json'))[env];

const seedMessages = async () => {
    try {
        await mongoose.connect(config.mongodb_url);
        console.log("🍃 Đang bơm dữ liệu mẫu vào MongoDB...");

        // Xóa dữ liệu cũ để tránh trùng lặp
        await Message.deleteMany({});

        const dummyMessages = [
            {
                conversation_id: 1,
                sender_id: 1,
                sender_name: "Nguyễn Văn Dân",
                content: "Chào cán bộ, hố ga chỗ này hỏng lâu rồi ạ.",
                type: 'text'
            },
            {
                conversation_id: 1,
                sender_id: 2,
                sender_name: "Cán bộ Y tế",
                content: "Chào bạn, chúng tôi đã tiếp nhận và sẽ cử người xử lý ngay.",
                type: 'text'
            }
        ];

        await Message.insertMany(dummyMessages);
        console.log("✅ Đã bơm xong tin nhắn mẫu!");
        process.exit();
    } catch (err) {
        console.error("❌ Lỗi Seed Mongo:", err);
        process.exit(1);
    }
};

seedMessages();