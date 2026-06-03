import api from "./api.service";

export const getMyNotificationsAPI = async () => {
  try {
    const res = await api.get("/notifications");
    return res.data;
  } catch (err) {
    console.log("❌ getMyNotificationsAPI:", err?.response?.data || err.message);
    return {
      success: false,
      data: [],
      count: 0,
      message: err?.response?.data?.message || "Không thể lấy thông báo",
    };
  }
};

export const getUnreadNotificationCountAPI = async () => {
  try {
    const res = await api.get("/notifications/unread-count");
    return res.data;
  } catch (err) {
    console.log("❌ getUnreadNotificationCountAPI:", err?.response?.data || err.message);
    return {
      success: false,
      data: { unreadCount: 0 },
      unreadCount: 0,
      message: err?.response?.data?.message || "Không thể lấy số thông báo chưa đọc",
    };
  }
};

export const markAllNotificationsAsReadAPI = async () => {
  const res = await api.put("/notifications/read-all");
  return res.data;
};

export const markNotificationAsReadAPI = async (notificationId) => {
  const res = await api.put(`/notifications/read/${notificationId}`);
  return res.data;
};

export const deleteNotificationAPI = async (notificationId) => {
  const res = await api.delete(`/notifications/${notificationId}`);
  return res.data;
};
