import api from "./api.service";

export const getConversationsAPI = async () => {
  try {
    const res = await api.get("/chat/conversations");
    return res.data;
  } catch (err) {
    console.log("❌ getConversationsAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Không thể lấy danh sách chat",
      data: [],
    };
  }
};

export const initOneToOneChatAPI = async (partnerId) => {
  try {
    const res = await api.post("/chat/init-1-1", { partnerId });
    return res.data;
  } catch (err) {
    console.log("❌ initOneToOneChatAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Không thể mở chat riêng",
      data: null,
    };
  }
};

export const getMessagesAPI = async (conversationId, cursor = null) => {
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

export const sendMessageAPI = async (payload) => {
  try {
    const res = await api.post("/chat/message", payload);
    return res.data;
  } catch (err) {
    console.log("❌ sendMessageAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Gửi tin nhắn thất bại",
    };
  }
};

export const reactMessageAPI = async (payload) => {
  try {
    const res = await api.post("/chat/message/react", payload);
    return res.data;
  } catch (err) {
    console.log("❌ reactMessageAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Lỗi thả cảm xúc",
    };
  }
};
export const getPresignedUrlAPI = async (payload) => {
  try {
    const res = await api.post("/upload/presigned-url", payload);
    return res.data;
  } catch (err) {
    console.log("❌ getPresignedUrlAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Không lấy được presigned url",
    };
  }
};

// Tìm kiếm tin nhắn
export const searchMessagesAPI = async (conversationId, keyword) => {
  try {
    const res = await api.get(`/chat/message/search?conversationId=${conversationId}&keyword=${keyword}`);
    return res.data;
  } catch (err) {
    console.log("❌ searchMessagesAPI:", err?.response?.data || err.message);
    return { success: false, data: [] };
  }
};

// Ghim / Bỏ ghim tin nhắn
export const pinMessageAPI = async (payload) => {
  try {
    const res = await api.post("/chat/message/pin", payload);
    return res.data;
  } catch (err) {
    console.log("❌ pinMessageAPI:", err?.response?.data || err.message);
    return { success: false };
  }
};

// Lấy danh sách tin nhắn đã ghim
export const getPinnedMessagesAPI = async (conversationId) => {
  try {
    const res = await api.get(`/chat/message/pinned/${conversationId}`);
    return res.data;
  } catch (err) {
    console.log("❌ getPinnedMessagesAPI:", err?.response?.data || err.message);
    return { success: false, data: [] };
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
