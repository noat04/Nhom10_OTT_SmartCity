import api from "../service/api.service";

// ==============================
// 📩 LẤY LỊCH SỬ TIN NHẮN
// ==============================
export const getMessages = async (conversationId, cursor = null) => {
  try {
    const params = {};

    if (cursor) params.cursor = cursor;

    const res = await api.get(`/chat/${conversationId}/history`, {
      params,
    });

    return res.data;
  } catch (err) {
    console.error("❌ getMessages:", err?.response?.data || err.message);

    return {
      success: false,
      data: {
        messages: [],
        nextCursor: null,
        hasMore: false,
      },
    };
  }
};

// ==============================
// 📤 GỬI TIN NHẮN (TEXT / FILE)
// ==============================
export const sendMessageAPI = async (data) => {
  try {
    const res = await api.post("/chat/message", data);

    return res.data;
  } catch (err) {
    console.error("❌ sendMessage:", err?.response?.data || err.message);

    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Gửi tin nhắn thất bại",
    };
  }
};

// ==============================
// 💬 DANH SÁCH CUỘC TRÒ CHUYỆN
// ==============================
export const getConversations = async () => {
  try {
    const res = await api.get("/chat/conversations");

    return res.data;
  } catch (err) {
    console.error("❌ getConversations:", err?.response?.data || err.message);

    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Lỗi load conversations",
      data: [],
    };
  }
};

// ==============================
// 👥 LẤY / TẠO CHAT RIÊNG THEO FRIEND ID
// Dùng khi bấm vào 1 người trong danh sách bạn bè
// ==============================
export const getOrCreatePrivateConversationAPI = async (friendId) => {
  try {
    const res = await api.get(`/chat/private/${friendId}`);

    return res.data;
  } catch (err) {
    console.error(
      "❌ getOrCreatePrivateConversationAPI:",
      err?.response?.data || err.message
    );

    return {
      success: false,
      status: err?.response?.status,
      message:
        err?.response?.data?.message || "Không thể mở cuộc trò chuyện riêng",
      data: null,
    };
  }
};

// ==============================
// ☁️ LẤY PRESIGNED URL (UPLOAD FILE)
// ==============================
export const getPresignedUrl = async (data) => {
  try {
    const res = await api.post("/upload/presigned-url", data);

    return res.data;
  } catch (err) {
    console.error("❌ getPresignedUrl:", err?.response?.data || err.message);

    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Lỗi lấy link upload",
    };
  }
};

// ==============================
// Sửa tin nhắn
// ==============================
export const editMessageAPI = async (data) => {
  const res = await api.put("/chat/message/edit", data);
  return res.data;
};

// ==============================
// Xóa tin nhắn
// ==============================
export const deleteMessageAPI = async (data) => {
  const res = await api.delete("/chat/message/delete", { data });
  return res.data;
};


//Reaction
export const reactMessageAPI = async (data) => {
  const res = await api.post("/chat/message/react", data); // ✅
  return res.data;
};

//Tìm kiếm tin nhắn
export const searchMessagesAPI = (conversationId, keyword) => {
  return api.get("/chat/message/search", {
    params: { conversationId, keyword },
  });
};

//Ghim tin nhắn
export const pinMessageAPI = (conversationId, messageId) => {
  return api.post("/chat/message/pin", {
    conversationId,
    messageId,
  });
};
export const getPinnedMessagesAPI = (conversationId) => {
  return api.get(`/chat/message/pinned/${conversationId}`);
};