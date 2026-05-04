const Call = require('../../../models/call');

const getCallHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Lấy tất cả cuộc gọi mà user này có tham gia
        const calls = await Call.find({
            $or: [
                { callerId: userId },
                { 'participants.userId': userId }
            ]
        })
        .populate('callerId', 'username avatar fullName')
        .populate('participants.userId', 'username avatar fullName')
        .sort({ createdAt: -1 })
        .limit(20);

        res.json({ success: true, data: calls });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getCallHistory };