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

// =========================================================================
// ============================== GROUP CHAT ===============================
// =========================================================================

export const createGroupAPI = async (payload) => {
  try {
    const res = await api.post("/chat/group/create", payload);
    return res.data;
  } catch (err) {
    console.log("❌ createGroupAPI:", err?.response?.data || err.message);
    return {
      success: false,
      message: err?.response?.data?.message || "Không thể tạo nhóm",
    };
  }
};

export const getGroupInfoAPI = async (conversationId) => {
  try {
    const res = await api.get(`/chat/group/${conversationId}/info`);
    return res.data;
  } catch (err) {
    console.log("❌ getGroupInfoAPI:", err?.response?.data || err.message);
    return { success: false, data: null };
  }
};

export const getGroupMembersAPI = async (conversationId) => {
  try {
    const res = await api.get(`/chat/group/${conversationId}/members`);
    return res.data;
  } catch (err) {
    console.log("❌ getGroupMembersAPI:", err?.response?.data || err.message);
    return { success: false, data: [] };
  }
};

export const addGroupMembersAPI = async (payload) => {
  try {
    const res = await api.post("/chat/group/add-members", payload);
    return res.data;
  } catch (err) {
    console.log("❌ addGroupMembersAPI:", err?.response?.data || err.message);
    return {
      success: false,
      message: err?.response?.data?.message || "Lỗi thêm thành viên",
    };
  }
};
export const forwardMessageAPI = async (payload) => {
  try {
    const res = await api.post("/chat/message/forward", payload);
    return res.data;
  } catch (err) {
    console.log("❌ forwardMessageAPI:", err?.response?.data || err.message);
    return { success: false, message: err?.response?.data?.message || "Lỗi chuyển tiếp" };
  }
};
export const removeGroupMemberAPI = async (payload) => {
  try {
    const res = await api.post("/chat/group/remove-member", payload);
    return res.data;
  } catch (err) {
    console.log("❌ removeGroupMemberAPI:", err?.response?.data || err.message);
    return {
      success: false,
      message: err?.response?.data?.message || "Lỗi xóa thành viên",
    };
  }
};

export const leaveGroupAPI = async (payload) => {
  try {
    const res = await api.post("/chat/group/leave", payload);
    return res.data;
  } catch (err) {
    console.log("❌ leaveGroupAPI:", err?.response?.data || err.message);
    return {
      success: false,
      message: err?.response?.data?.message || "Lỗi rời nhóm",
    };
  }
};

export const updateGroupInfoAPI = async (payload) => {
  try {
    const res = await api.put("/chat/group/update-info", payload);
    return res.data;
  } catch (err) {
    console.log("❌ updateGroupInfoAPI:", err?.response?.data || err.message);
    return {
      success: false,
      message: err?.response?.data?.message || "Lỗi cập nhật thông tin nhóm",
    };
  }
};

export const promoteGroupAdminAPI = async (payload) => {
  try {
    const res = await api.post("/chat/group/promote-admin", payload);
    return res.data;
  } catch (err) {
    console.log("❌ promoteGroupAdminAPI:", err?.response?.data || err.message);
    return {
      success: false,
      message: err?.response?.data?.message || "Lỗi chuyển quyền Admin",
    };
  }
};