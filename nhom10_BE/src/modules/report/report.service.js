const db = require('../../../models');
const socketIO = require('../../shared/utils/socket'); // Import socket util

const createReport = async (userId, reportData) => {
    const { title, description, images, lat, lng, address, department_id } = reportData;

    // Sử dụng Transaction để đảm bảo: Hoặc tạo được cả 2, hoặc không tạo gì cả
    const result = await db.sequelize.transaction(async (t) => {

        // 1. Tạo một cuộc hội thoại mới cho sự cố này
        const newConversation = await db.Conversation.create({
            title: `Chat: ${title}`,
            type: 'PRIVATE',
            department_id: department_id,
            location_id: reportData.location_id || null
        }, { transaction: t });

        // 2. Tạo bản ghi Report gắn với Conversation vừa tạo
        const newReport = await db.Report.create({
            title,
            description,
            images,
            lat,
            lng,
            address,
            status: 'PENDING',
            citizen_id: userId, // Lấy từ token người dùng đang đăng nhập
            department_id,
            conversation_id: newConversation.id
        }, { transaction: t });

        return newReport;
    });

    // --- PHẦN MỚI: PHÁT THÔNG BÁO REAL-TIME ---
    const io = socketIO.getIO();

    // Gửi thông báo tới tất cả cán bộ thuộc phòng ban này
    io.to(`dept_${result.department_id}`).emit("new-report", {
        message: "Có một phản ánh mới cần xử lý!",
        reportTitle: result.title,
        reportId: result.id
    });

    return result;
};

module.exports = { createReport };