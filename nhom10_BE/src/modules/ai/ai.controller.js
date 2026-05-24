const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const AiSession = require("../../../models/AiSession");
const AiMessage = require("../../../models/AiMessage");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ================================================================
// CẤU HÌNH GIỚI HẠN NỘI DUNG
// ================================================================

// Giới hạn độ dài input của người dùng
const INPUT_LIMITS = {
    MIN_LENGTH: 5,
    MAX_LENGTH: 500,
};

// Giới hạn lịch sử hội thoại gửi lên API (để tiết kiệm token)
const MAX_HISTORY_TURNS = 10; // Giữ tối đa 10 lượt (20 message: user + model)

// Danh sách chủ đề bị chặn (rõ ràng ngoài phạm vi dịch vụ công)
const OFF_TOPIC_PATTERNS = [
    /\b(chứng khoán|cổ phiếu|forex|bitcoin|crypto|tiền ảo)\b/i,
    /\b(tình yêu|hẹn hò|yêu đương|bạn trai|bạn gái|crush)\b/i,
    /\b(viết code|lập trình|debug|javascript|python|html|css)\b/i,
    /\b(hack|crack|phá mật khẩu|ddos|tấn công)\b/i,
    /\b(cờ bạc|casino|cá độ|lô đề|xổ số)\b/i,
    /\b(thuốc|dược phẩm|chữa bệnh|triệu chứng|bác sĩ)\b/i,
    /\b(nấu ăn|công thức|nguyên liệu|món ăn|recipe)\b/i,
];

// System prompt dành riêng cho dịch vụ công — gắn cứng mọi request
const SYSTEM_PROMPT = `Bạn là trợ lý ảo hỗ trợ tra cứu thông tin DỊCH VỤ CÔNG tại Việt Nam.

PHẠM VI HỖ TRỢ (chỉ trả lời các chủ đề sau):
- Thủ tục hành chính, giấy tờ, hồ sơ
- Đăng ký kinh doanh, giấy phép
- Thuế, bảo hiểm xã hội, bảo hiểm y tế
- Đăng ký khai sinh, kết hôn, hộ khẩu, CCCD
- Cổng dịch vụ công quốc gia, cơ quan nhà nước
- Chính sách, văn bản pháp luật liên quan hành chính công

QUY TẮC BẮT BUỘC:
1. Nếu câu hỏi KHÔNG thuộc phạm vi trên, trả lời đúng một câu:
   "Xin lỗi, mình chỉ hỗ trợ thông tin về dịch vụ công và thủ tục hành chính. Bạn có câu hỏi nào về lĩnh vực này không?"
2. Trả lời đầy đủ, rõ ràng bằng tiếng Việt — KHÔNG được dừng giữa chừng, phải hoàn thành trọn vẹn câu trả lời. Với câu hỏi đơn giản thì ngắn gọn; với thủ tục nhiều bước thì liệt kê hết các bước
3. Không đưa ra tư vấn pháp lý cụ thể — chỉ cung cấp thông tin tham khảo
4. Nếu có, hãy dẫn nguồn (tên văn bản, cổng thông tin gov.vn)
5. Kết thúc mỗi câu trả lời bằng gợi ý người dùng xác minh tại cơ quan có thẩm quyền nếu cần thiết`;

// ================================================================
// HÀM TIỆN ÍCH: LỌC INPUT PHÍA SERVER
// ================================================================
function validateUserInput(prompt) {
    // Kiểm tra rỗng
    if (!prompt || typeof prompt !== "string") {
        return { valid: false, message: "Vui lòng nhập câu hỏi!" };
    }

    const trimmed = prompt.trim();

    // Kiểm tra độ dài tối thiểu
    if (trimmed.length < INPUT_LIMITS.MIN_LENGTH) {
        return { valid: false, message: "Câu hỏi quá ngắn, bạn muốn hỏi gì vậy?" };
    }

    // Kiểm tra độ dài tối đa
    if (trimmed.length > INPUT_LIMITS.MAX_LENGTH) {
        return {
            valid: false,
            message: `Câu hỏi quá dài (tối đa ${INPUT_LIMITS.MAX_LENGTH} ký tự). Bạn có thể rút gọn lại không?`,
        };
    }

    // Kiểm tra chủ đề lạc đề (blocklist)
    const isOffTopic = OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(trimmed));
    if (isOffTopic) {
        return {
            valid: false,
            message:
                "Xin lỗi, mình chỉ hỗ trợ thông tin về dịch vụ công và thủ tục hành chính. Bạn có câu hỏi nào về lĩnh vực này không?",
        };
    }

    return { valid: true, trimmed };
}

// ================================================================
// TRƯỜNG HỢP 1: LẤY DANH SÁCH CÁC PHIÊN CHAT CŨ (INIT)
// ================================================================
exports.getAiSessions = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const sessions = await AiSession.find({ userId }).sort({ updatedAt: -1 });
        return res.status(200).json({ success: true, data: sessions });
    } catch (error) {
        console.error("Lỗi lấy danh sách session:", error);
        return res.status(500).json({ success: false, message: "Lỗi tải lịch sử chat AI" });
    }
};

// ================================================================
// TRƯỜNG HỢP 2: CHAT VỚI TRỢ LÝ (CÓ LƯU LỊCH SỬ)
// ================================================================
exports.askAssistant = async (req, res) => {
    try {
        const { prompt, sessionId } = req.body;
        const userId = req.user._id || req.user.id;

        // --- BƯỚC 1: LỌC INPUT PHÍA SERVER (trước khi tốn bất kỳ chi phí nào) ---
        const validation = validateUserInput(prompt);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.message });
        }
        const cleanPrompt = validation.trimmed;

        // --- BƯỚC 2: XÁC ĐỊNH SESSION ---
        let currentSessionId = sessionId;
        let chatHistory = [];
        const isValidId = mongoose.Types.ObjectId.isValid(currentSessionId);

        if (currentSessionId && isValidId) {
            // Lấy lịch sử, chỉ giữ MAX_HISTORY_TURNS lượt gần nhất để tránh bloat context
            const oldMessages = await AiMessage.find({
                sessionId: new mongoose.Types.ObjectId(currentSessionId),
            })
                .sort({ createdAt: -1 })         // Lấy mới nhất trước
                .limit(MAX_HISTORY_TURNS * 2)    // *2 vì mỗi lượt có user + model
                .then((msgs) => msgs.reverse()); // Đảo lại đúng thứ tự thời gian

            chatHistory = oldMessages.map((msg) => ({
                role: msg.role,
                parts: [{ text: msg.content }],
            }));
        } else {
            // Tạo session mới
            const newSession = await AiSession.create({
                userId,
                title: cleanPrompt.substring(0, 50) + (cleanPrompt.length > 50 ? "..." : ""),
                assistantType: "public_service",
            });
            currentSessionId = newSession._id;
        }

        // --- BƯỚC 3: LƯU TIN NHẮN NGƯỜI DÙNG ---
        await AiMessage.create({
            sessionId: currentSessionId,
            role: "user",
            content: cleanPrompt,
        });

        // --- BƯỚC 4: GỌI GOOGLE AI VỚI CẤU HÌNH ĐẦY ĐỦ ---
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT,   // System prompt gắn cố định mọi request
            generationConfig: {
                maxOutputTokens: 1500,          // Đủ cho câu trả lời thủ tục hành chính chi tiết (~700-900 từ)
                temperature: 0.3,               // Ưu tiên độ chính xác, hạn chế sáng tạo tự do
                topP: 0.8,                      // Hạn chế thêm độ ngẫu nhiên của output
            },
        });

        const chat = model.startChat({ history: chatHistory });

        try {
            const result = await chat.sendMessage(cleanPrompt);
            const text = result.response.text();

            // --- BƯỚC 5: LƯU PHẢN HỒI AI ---
            await AiMessage.create({
                sessionId: currentSessionId,
                role: "model",
                content: text,
            });

            return res.status(200).json({
                success: true,
                data: text,
                sessionId: currentSessionId,
            });
        } catch (aiError) {
            console.error("❌ Lỗi Google AI API:", aiError);

            if (aiError.status === 429 || aiError.message?.includes("429")) {
                return res.status(429).json({
                    success: false,
                    message: "Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi 1 phút rồi thử lại nhé!",
                });
            }
            if (aiError.status === 503 || aiError.message?.includes("503")) {
                return res.status(503).json({
                    success: false,
                    message: "Máy chủ AI đang bận. Thử lại sau giây lát!",
                });
            }
            throw aiError;
        }
    } catch (error) {
        console.error("❌ Lỗi hệ thống askAssistant:", error);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống. Vui lòng thử lại sau." });
    }
};

// ================================================================
// TRƯỜNG HỢP 3: TẢI TIN NHẮN CỦA 1 PHIÊN
// ================================================================
exports.getAiMessagesBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(200).json({ success: true, data: [] });
        }

        const messages = await AiMessage.find({
            sessionId: new mongoose.Types.ObjectId(sessionId),
        }).sort({ createdAt: 1 });

        return res.status(200).json({ success: true, data: messages });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
};

// ================================================================
// TRƯỜNG HỢP 4: XÓA PHIÊN CHAT
// ================================================================
exports.deleteAiSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ success: false, message: "Session ID không hợp lệ." });
        }

        await AiMessage.deleteMany({ sessionId });
        await AiSession.findByIdAndDelete(sessionId);

        return res.status(200).json({ success: true, message: "Đã xóa cuộc trò chuyện." });
    } catch (error) {
        console.error("Lỗi xóa session:", error);
        return res.status(500).json({ success: false, message: "Lỗi xóa chat AI" });
    }
};

// ================================================================
// TÍNH NĂNG: TÓM TẮT TIN NHẮN
// ================================================================
exports.summarizeChat = async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || messages.length === 0) {
            return res.status(400).json({ success: false, message: "Không có dữ liệu để tóm tắt." });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                maxOutputTokens: 300,
                temperature: 0.2,
            },
        });

        const chatContext = messages.map((msg) => `[${msg.senderName}]: ${msg.content}`).join("\n");
        const promptText = `Dưới đây là một đoạn hội thoại. Hãy tóm tắt ngắn gọn những ý chính, quyết định quan trọng hoặc công việc cần làm trong tối đa 3-4 câu.\n\nĐoạn hội thoại:\n${chatContext}`;

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        return res.status(200).json({ success: true, data: text });
    } catch (error) {
        console.error("Lỗi Summarize AI:", error);
        return res.status(500).json({ success: false, message: "Lỗi tóm tắt tin nhắn." });
    }
};