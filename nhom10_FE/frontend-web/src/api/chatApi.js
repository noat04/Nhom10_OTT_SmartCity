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
// <<<<<<< HEAD
// =======
// Thu hồi tin nhắn
// ==============================
export const unsendMessageAPI = async (data) => {
  try {
    const res = await api.put("/chat/message/unsend", data);
    return res.data;
  } catch (err) {
    console.error("❌ unsendMessageAPI:", err?.response?.data || err.message);
    return {
      success: false,
      message: err?.response?.data?.message || "Thu hồi thất bại",
    };
  }
};

// ==============================
// >>>>>>> origin/dam
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
// <<<<<<< HEAD
// export const getPinnedMessagesAPI = (conversationId) => {
//   return api.get(`/chat/message/pinned/${conversationId}`);
// =======

export const getPinnedMessagesAPI = async (conversationId) => {
  try {
    const res = await api.get(`/chat/message/pinned/${conversationId}`);
    return res.data;
  } catch (err) {
    console.error("❌ getPinnedMessagesAPI:", err?.response?.data || err.message);
    return { success: false, data: [] };
  }
};

// ==============================
// GROUP CHAT APIs
// ==============================
export const getGroupInfoAPI = async (conversationId) => {
  try {
    const res = await api.get(`/chat/group/${conversationId}/info`);
    return res.data;
  } catch (err) {
    console.error("❌ getGroupInfoAPI:", err?.response?.data || err.message);
    return { success: false, data: null };
  }
};

export const addMembersAPI = async (data) => {
  try {
    const res = await api.post("/chat/group/add-members", data);
    return res.data;
  } catch (err) {
    console.error("❌ addMembersAPI:", err?.response?.data || err.message);
    return { success: false };
  }
};

export const removeMemberAPI = async (data) => {
  try {
    const res = await api.post("/chat/group/remove-member", data);
    return res.data;
  } catch (err) {
    console.error("❌ removeMemberAPI:", err?.response?.data || err.message);
    return { success: false };
  }
};

export const leaveGroupAPI = async (data) => {
  try {
    const res = await api.post("/chat/group/leave", data);
    return res.data;
  } catch (err) {
    console.error("❌ leaveGroupAPI:", err?.response?.data || err.message);
    return { success: false };
  }
};

export const promoteAdminAPI = async (data) => {
  try {
    const res = await api.post("/chat/group/promote-admin", data);
    return res.data;
  } catch (err) {
    console.error("❌ promoteAdminAPI:", err?.response?.data || err.message);
    return { success: false };
  }
};

export const updateGroupInfoAPI = async (data) => {
  try {
    const res = await api.put("/chat/group/update-info", data);
    return res.data;
  } catch (err) {
    console.error("❌ updateGroupInfoAPI:", err?.response?.data || err.message);
    return { success: false };
  }
};

// ==============================
// Tạo nhóm chat
// ==============================
export const createGroupAPI = async (data) => {
  try {
    const res = await api.post("/chat/group/create", data);
    return res.data;
  } catch (err) {
    console.error("❌ createGroupAPI:", err?.response?.data || err.message);
    return {
      success: false,
      message: err?.response?.data?.message || "Tạo nhóm thất bại",
    };
  }
  // >>>>>>> origin/dam
};