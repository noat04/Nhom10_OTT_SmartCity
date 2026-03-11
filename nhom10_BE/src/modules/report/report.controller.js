const reportService = require('./report.service');

const postReport = async (req, res) => {
    try {
        // req.user.id lấy từ Middleware verifyToken
        const userId = req.user.id;
        const report = await reportService.createReport(userId, req.body);

        res.status(201).json({
            success: true,
            message: "Gửi phản ánh và tạo phòng chat thành công!",
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = { postReport };