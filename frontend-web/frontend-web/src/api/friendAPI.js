import api from "../service/api.service";

export const searchUsersAPI = async (keyword) => {
  try {
    const res = await api.get("/friend/search", {
      params: { keyword },
    });
    return res.data;
  } catch (err) {
    console.error("❌ searchUsersAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Lỗi tìm kiếm người dùng",
      data: [],
    };
  }
};

export const sendFriendRequestAPI = async (receiverId) => {
  try {
    const res = await api.post("/friend/request", { receiverId });
    return res.data;
  } catch (err) {
    console.error("❌ sendFriendRequestAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Gửi lời mời kết bạn thất bại",
    };
  }
};

export const getFriendRequestsAPI = async () => {
  try {
    const res = await api.get("/friend/requests");
    return res.data;
  } catch (err) {
    console.error("❌ getFriendRequestsAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Không thể lấy danh sách lời mời",
      data: { received: [], sent: [] },
    };
  }
};

export const acceptFriendRequestAPI = async (requestId) => {
  try {
    const res = await api.put(`/friend/accept/${requestId}`);
    return res.data;
  } catch (err) {
    console.error("❌ acceptFriendRequestAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Không thể chấp nhận lời mời",
    };
  }
};

export const rejectFriendRequestAPI = async (requestId) => {
  try {
    const res = await api.put(`/friend/reject/${requestId}`);
    return res.data;
  } catch (err) {
    console.error("❌ rejectFriendRequestAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Không thể từ chối lời mời",
    };
  }
};

export const getFriendsAPI = async () => {
  try {
    const res = await api.get("/friend/list");
    return res.data;
  } catch (err) {
    console.error("❌ getFriendsAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Không thể lấy danh sách bạn bè",
      count: 0,
      data: [],
    };
  }
};

export const getFriendProfileAPI = async (friendId) => {
  try {
    const res = await api.get(`/friend/profile/${friendId}`);
    return res.data;
  } catch (err) {
    console.error("❌ getFriendProfileAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Không thể lấy thông tin người dùng",
      data: null,
    };
  }
};

export const removeFriendAPI = async (friendId) => {
  try {
    const res = await api.delete(`/friend/remove/${friendId}`);
    return res.data;
  } catch (err) {
    console.error("❌ removeFriendAPI:", err?.response?.data || err.message);
    return {
      success: false,
      status: err?.response?.status,
      message: err?.response?.data?.message || "Không thể xóa bạn bè",
    };
  }
};