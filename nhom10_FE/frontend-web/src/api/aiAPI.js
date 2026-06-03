import api from "../service/api.service";

/**
 * 1. Gọi API Trợ lý ảo (Dịch vụ công) - Có hỗ trợ lưu lịch sử (sessionId)
 * @param {string} prompt - Câu hỏi của người dùng
 * @param {string|null} sessionId - ID của phiên chat (nếu chat tiếp), null nếu tạo mới
 * @returns {Promise<{success: boolean, data?: string, sessionId?: string, message?: string}>}
 */
export const askPublicServiceAI = async (prompt, sessionId = null) => {
    try {
        const response = await api.post("/ai/assistant", { prompt, sessionId });
        return response.data; // Trường hợp thành công
    } catch (error) {
        // TRẢ VỀ message từ Backend gửi xuống khi có lỗi (400, 500, 503...)
        return {
            success: false,
            message: error.response?.data?.message || "Hệ thống AI đang bận. Thử lại sau nhé!"
        };
    }
};

/**
 * 2. Lấy danh sách các cuộc trò chuyện với AI (Sidebar bên trái)
 * @returns {Promise<{success: boolean, data?: Array, message?: string}>}
 */
export const getAiSessionsAPI = async () => {
    try {
        const response = await api.get("/ai/sessions");
        return response.data || response;
    } catch (error) {
        console.error("❌ Lỗi getAiSessionsAPI:", error);
        return {
            success: false,
            message: error?.response?.data?.message || "Không thể tải danh sách chat AI.",
        };
    }
};

/**
 * 3. Lấy lịch sử tin nhắn của một cuộc trò chuyện AI cụ thể
 * @param {string} sessionId - ID của phiên chat
 * @returns {Promise<{success: boolean, data?: Array, message?: string}>}
 */
export const getAiMessagesAPI = async (sessionId) => {
    try {
        const response = await api.get(`/ai/messages/${sessionId}`);
        return response.data || response;
    } catch (error) {
        console.error("❌ Lỗi getAiMessagesAPI:", error);
        return {
            success: false,
            message: error?.response?.data?.message || "Không thể tải lịch sử tin nhắn AI.",
        };
    }
};

/**
 * 4. Xóa một cuộc trò chuyện AI
 * @param {string} sessionId - ID của phiên chat cần xóa
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const deleteAiSessionAPI = async (sessionId) => {
    try {
        const response = await api.delete(`/ai/sessions/${sessionId}`);
        return response.data || response;
    } catch (error) {
        console.error("❌ Lỗi deleteAiSessionAPI:", error);
        return {
            success: false,
            message: error?.response?.data?.message || "Không thể xóa cuộc trò chuyện AI.",
        };
    }
};

/**
 * 5. Gọi API Tóm tắt danh sách tin nhắn
 * @param {Array} messages - Mảng tin nhắn cần tóm tắt (từ 10-20 tin)
 * @returns {Promise<{success: boolean, data?: string, message?: string}>}
 */
export const summarizeMessagesAPI = async (messages) => {
    try {
        const response = await api.post("/ai/summarize", { messages });
        return response.data || response;
    } catch (error) {
        console.error("❌ Lỗi summarizeMessagesAPI:", error);
        return {
            success: false,
            message: error?.response?.data?.message || "Không thể tóm tắt tin nhắn lúc này.",
        };
    }
};
