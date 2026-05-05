const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose"); // Thêm dòng này ở đầu file
// Nhớ import 2 Model DB của bạn vào đây
const AiSession = require("../../../models/AiSession");
const AiMessage = require("../../../models/AiMessage");

// Khởi tạo Gemini bằng API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ================================================================
// TRƯỜNG HỢP 1: LẤY DANH SÁCH CÁC PHIÊN CHAT CŨ (INIT)
// ================================================================
exports.getAiSessions = async (req, res) => {
    try {
        // Lấy ID người dùng từ middleware xác thực (JWT)
        const userId = req.user._id || req.user.id;

        const sessions = await AiSession.find({ userId }).sort({ updatedAt: -1 });
        return res.status(200).json({ success: true, data: sessions });
    } catch (error) {
        console.error("Lỗi lấy danh sách session:", error);
        return res.status(500).json({ success: false, message: "Lỗi tải lịch sử chat AI" });
    }
};

// ================================================================
// TRƯỜNG HỢP 2 & LÀM MỚI: CHAT VỚI TRỢ LÝ (CÓ LƯU LỊCH SỬ)
// ================================================================
exports.askAssistant = async (req, res) => {
    try {
        const { prompt, sessionId } = req.body;
        const userId = req.user._id || req.user.id;

        if (!prompt) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập câu hỏi!" });
        }

        let currentSessionId = sessionId;
        let chatHistory = [];

        // 1. KIỂM TRA ID HỢP LỆ
        const isValidId = mongoose.Types.ObjectId.isValid(currentSessionId);

        if (currentSessionId && isValidId) {
            // Lấy lịch sử nếu đã có session cũ
            const oldMessages = await AiMessage.find({
                sessionId: new mongoose.Types.ObjectId(currentSessionId)
            }).sort({ createdAt: 1 });

            chatHistory = oldMessages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            }));
        } else {
            // Tạo session mới nếu chưa có hoặc ID không hợp lệ (ví dụ: "new_ai_chat")
            const newSession = await AiSession.create({
                userId,
                title: prompt.substring(0, 30) + (prompt.length > 30 ? "..." : ""),
                assistantType: 'public_service'
            });
            currentSessionId = newSession._id;
        }

        // 2. LƯU TIN NHẮN CỦA NGƯỜI DÙNG
        await AiMessage.create({
            sessionId: currentSessionId,
            role: 'user',
            content: prompt
        });

        // 3. CẤU HÌNH MODEL (Đổi sang gemini-1.5-flash để ổn định và tránh lỗi 503)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const chat = model.startChat({ history: chatHistory });

        const systemPrompt = chatHistory.length === 0
            ? `Bạn là trợ lý ảo hỗ trợ dịch vụ công Việt Nam. Trả lời lịch sự, ngắn gọn.\n\n`
            : "";

        try {
            // 4. GỌI API GOOGLE AI
            const result = await chat.sendMessage(systemPrompt + prompt);
            const text = result.response.text();

            // 5. LƯU PHẢN HỒI CỦA AI
            await AiMessage.create({
                sessionId: currentSessionId,
                role: 'model',
                content: text
            });

            return res.status(200).json({
                success: true,
                data: text,
                sessionId: currentSessionId
            });

        } catch (aiError) {
            console.error("❌ Lỗi Google AI API:", aiError);

            // Bắt lỗi 429 - Quá giới hạn tốc độ
            if (aiError.status === 429 || aiError.message.includes("429")) {
                return res.status(429).json({
                    success: false,
                    message: "Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi 1 phút rồi thử lại nhé!"
                });
            }

            // Bắt lỗi 503 - Server quá tải
            if (aiError.status === 503 || aiError.message.includes("503")) {
                return res.status(503).json({
                    success: false,
                    message: "Máy chủ AI đang bận. Thử lại sau giây lát!"
                });
            }
            throw aiError;
        }

    } catch (aiError) {
        console.error("❌ Lỗi Google AI API:", aiError);

        // Kiểm tra chính xác lỗi 503 từ Google
        if (aiError.status === 503 || aiError.message.includes("503")) {
            return res.status(503).json({
                success: false,
                message: "Hệ thống AI đang quá tải. Bạn vui lòng đợi vài giây rồi thử lại nhé!"
            });
        }
        throw aiError;
    }
};

// ================================================================
// TRƯỜNG HỢP 3: TẢI CHI TIẾT TIN NHẮN CỦA 1 PHIÊN CŨ (ĐÃ SỬA)
// ================================================================
exports.getAiMessagesBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Nếu ID không đúng định dạng ObjectId, trả về mảng rỗng luôn, không báo lỗi 400
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(200).json({ success: true, data: [] });
        }

        const messages = await AiMessage.find({
            sessionId: new mongoose.Types.ObjectId(sessionId)
        }).sort({ createdAt: 1 });

        return res.status(200).json({ success: true, data: messages });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
};

// ================================================================
// TRƯỜNG HỢP 4: XÓA ĐOẠN CHAT CŨ
// ================================================================
exports.deleteAiSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Xóa tất cả tin nhắn thuộc về session này
        await AiMessage.deleteMany({ sessionId });
        // Xóa session
        await AiSession.findByIdAndDelete(sessionId);

        return res.status(200).json({ success: true, message: "Đã xóa cuộc trò chuyện." });
    } catch (error) {
        console.error("Lỗi xóa session:", error);
        return res.status(500).json({ success: false, message: "Lỗi xóa chat AI" });
    }
};

// ================================================================
// TÍNH NĂNG: TÓM TẮT TIN NHẮN (GIỮ NGUYÊN)
// ================================================================
exports.summarizeChat = async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || messages.length === 0) {
            return res.status(400).json({ success: false, message: "Không có dữ liệu để tóm tắt." });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const chatContext = messages.map(msg => `[${msg.senderName}]: ${msg.content}`).join("\n");
        const promptText = `Dưới đây là một đoạn hội thoại. Hãy tóm tắt ngắn gọn những ý chính, quyết định quan trọng hoặc công việc cần làm trong tối đa 3-4 câu.\n\nĐoạn hội thoại:\n${chatContext}`;

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        return res.status(200).json({ success: true, data: text });
    } catch (error) {
        console.error("Lỗi Summarize AI:", error);
        return res.status(500).json({ success: false, message: "Lỗi tóm tắt tin nhắn." });
    }
};