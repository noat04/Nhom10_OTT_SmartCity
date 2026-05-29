import api from "./api.service";

export const getMyNotificationsAPI = async () => {
  const res = await api.get("/notifications");
  return res.data;
};

export const getUnreadNotificationCountAPI = async () => {
  const res = await api.get("/notifications/unread-count");
  return res.data;
};
