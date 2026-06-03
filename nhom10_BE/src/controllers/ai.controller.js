const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const AiSession = require("../models/aiSession");
const AiMessage = require("../models/aiMessage");

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
const AI_MODEL_CANDIDATES = [
    process.env.GEMINI_MODEL,
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
].filter(Boolean);

const getRequestUserId = (req) => req.user?._id || req.user?.id;

const saveAiMessageSafely = async (message) => {
    try {
        if (!message.sessionId) return;
        await AiMessage.create(message);
    } catch (error) {
        console.error("Loi luu tin nhan AI:", error.message || error);
    }
};

const buildSafeGeminiHistory = (messages = []) => {
    const safeHistory = [];
    let expectedRole = "user";

    for (const msg of messages) {
        if (!["user", "model"].includes(msg.role) || !msg.content) continue;

        if (msg.role !== expectedRole) {
            if (msg.role === "user") {
                while (safeHistory.length && safeHistory[safeHistory.length - 1].role === "user") {
                    safeHistory.pop();
                }
                expectedRole = "user";
            } else {
                continue;
            }
        }

        safeHistory.push({
            role: msg.role,
            parts: [{ text: msg.content }],
        });
        expectedRole = msg.role === "user" ? "model" : "user";
    }

    if (safeHistory.length && safeHistory[safeHistory.length - 1].role === "user") {
        safeHistory.pop();
    }

    return safeHistory.slice(-(MAX_HISTORY_TURNS * 2));
};

const askGeminiWithFallback = async (prompt, history) => {
    let lastError;

    for (const modelName of AI_MODEL_CANDIDATES) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_PROMPT,
                generationConfig: {
                    maxOutputTokens: 1500,
                    temperature: 0.3,
                    topP: 0.8,
                },
            });

            const chat = model.startChat({ history });
            const result = await chat.sendMessage(prompt);
            return result.response.text();
        } catch (error) {
            lastError = error;
            console.error(`Loi Google AI API voi model ${modelName}:`, error.message || error);
        }
    }

    throw lastError;
};

const buildLocalPublicServiceAnswer = (prompt = "") => {
    const text = String(prompt).toLowerCase();

    if (text.includes("thuế") || text.includes("thue") || text.includes("mã số thuế") || text.includes("ma so thue")) {
        return [
            "Hiện tại trợ lý AI bên ngoài đang tạm thời không phản hồi, mình trả lời theo dữ liệu hướng dẫn dự phòng.",
            "",
            "Với nội dung về thuế, bạn nên chuẩn bị trước các thông tin sau:",
            "1. Loại thủ tục cần làm: đăng ký mã số thuế, kê khai thuế, nộp thuế, hoàn thuế hoặc tra cứu nghĩa vụ thuế.",
            "2. Thông tin cá nhân/doanh nghiệp: CCCD/MST, họ tên hoặc tên doanh nghiệp, địa chỉ, số điện thoại, email.",
            "3. Hồ sơ liên quan: giấy đăng ký kinh doanh nếu là doanh nghiệp/hộ kinh doanh, chứng từ nộp thuế, tờ khai hoặc giấy tờ phát sinh.",
            "",
            "Bạn có thể thực hiện trên Cổng thông tin Thuế điện tử hoặc Cổng Dịch vụ công Quốc gia. Nếu hồ sơ có tình huống đặc biệt, nên liên hệ Chi cục Thuế nơi quản lý để được xác nhận chính xác."
        ].join("\n");
    }

    if (text.includes("cccd") || text.includes("căn cước") || text.includes("can cuoc")) {
        return [
            "Hiện tại trợ lý AI bên ngoài đang tạm thời không phản hồi, mình trả lời theo dữ liệu hướng dẫn dự phòng.",
            "",
            "Với thủ tục căn cước/CCCD, bạn thường cần:",
            "1. Đăng nhập hoặc đặt lịch trên Cổng Dịch vụ công nếu địa phương hỗ trợ.",
            "2. Chuẩn bị thông tin định danh cá nhân, giấy tờ chứng minh thay đổi thông tin nếu có.",
            "3. Đến cơ quan công an có thẩm quyền để xác thực, chụp ảnh, lấy vân tay và hoàn tất hồ sơ.",
            "",
            "Bạn nên kiểm tra hướng dẫn mới nhất tại cơ quan công an địa phương hoặc Cổng Dịch vụ công Quốc gia."
        ].join("\n");
    }

    if (text.includes("khai sinh") || text.includes("kết hôn") || text.includes("ket hon") || text.includes("hộ khẩu") || text.includes("ho khau")) {
        return [
            "Hiện tại trợ lý AI bên ngoài đang tạm thời không phản hồi, mình trả lời theo dữ liệu hướng dẫn dự phòng.",
            "",
            "Với nhóm thủ tục hộ tịch/cư trú, bạn nên chuẩn bị:",
            "1. Giấy tờ tùy thân của người yêu cầu.",
            "2. Giấy tờ chứng minh sự kiện hộ tịch/cư trú cần đăng ký.",
            "3. Biểu mẫu theo yêu cầu của UBND cấp xã/phường hoặc cơ quan công an.",
            "",
            "Bạn nên tra cứu thủ tục cụ thể trên Cổng Dịch vụ công Quốc gia hoặc liên hệ UBND/cơ quan công an nơi cư trú."
        ].join("\n");
    }

    return [
        "Hiện tại trợ lý AI bên ngoài đang tạm thời không phản hồi, mình trả lời theo dữ liệu hướng dẫn dự phòng.",
        "",
        "Bạn đang hỏi về dịch vụ công/thủ tục hành chính. Để mình hỗ trợ chính xác hơn, bạn hãy cho biết:",
        "1. Tên thủ tục cần làm.",
        "2. Bạn làm cho cá nhân, hộ kinh doanh hay doanh nghiệp.",
        "3. Tỉnh/thành phố hoặc cơ quan tiếp nhận hồ sơ.",
        "4. Bạn muốn biết hồ sơ cần chuẩn bị, các bước thực hiện, lệ phí hay thời gian xử lý.",
        "",
        "Thông tin cuối cùng nên được xác minh tại Cổng Dịch vụ công Quốc gia hoặc cơ quan có thẩm quyền."
    ].join("\n");
};

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
        const userId = getRequestUserId(req);

        if (!userId) {
            return res.status(401).json({ success: false, message: "Chua dang nhap." });
        }
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
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                success: false,
                message: "Chua cau hinh GEMINI_API_KEY tren server.",
            });
        }

        const { prompt, sessionId } = req.body;
        const userId = getRequestUserId(req);

        if (!userId) {
            return res.status(401).json({ success: false, message: "Chua dang nhap." });
        }

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

        try {
        if (currentSessionId && isValidId) {
            // Lấy lịch sử, chỉ giữ MAX_HISTORY_TURNS lượt gần nhất để tránh bloat context
            const oldMessages = await AiMessage.find({
                sessionId: new mongoose.Types.ObjectId(currentSessionId),
            })
                .sort({ createdAt: -1 })         // Lấy mới nhất trước
                .limit(MAX_HISTORY_TURNS * 2)    // *2 vì mỗi lượt có user + model
                .then((msgs) => msgs.reverse()); // Đảo lại đúng thứ tự thời gian

            chatHistory = buildSafeGeminiHistory(oldMessages);
        } else {
            // Tạo session mới
            const newSession = await AiSession.create({
                userId,
                title: cleanPrompt.substring(0, 50) + (cleanPrompt.length > 50 ? "..." : ""),
                assistantType: "public_service",
            });
            currentSessionId = newSession._id;
        }
        } catch (sessionError) {
            currentSessionId = null;
            chatHistory = [];
            console.error("Loi tao/tai session AI, tiep tuc khong luu lich su:", sessionError.message || sessionError);
        }

        // --- BƯỚC 3: LƯU TIN NHẮN NGƯỜI DÙNG ---
        await saveAiMessageSafely({
            sessionId: currentSessionId,
            role: "user",
            content: cleanPrompt,
        });

        try {
            const text = await askGeminiWithFallback(cleanPrompt, chatHistory);

            // --- BƯỚC 5: LƯU PHẢN HỒI AI ---
            await saveAiMessageSafely({
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
            console.error("Loi Google AI API, dung cau tra loi du phong:", aiError.message || aiError);

            const fallbackText = buildLocalPublicServiceAnswer(cleanPrompt);

            await saveAiMessageSafely({
                sessionId: currentSessionId,
                role: "model",
                content: fallbackText,
            });

            return res.status(200).json({
                success: true,
                data: fallbackText,
                sessionId: currentSessionId,
                fallback: true,
            });
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
