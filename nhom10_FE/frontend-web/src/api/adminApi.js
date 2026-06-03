import api from "../service/api.service";

export const getAdminDashboard = async () => (await api.get("/admin/dashboard")).data;
export const getAdminUsers = async (q = "") => (await api.get("/admin/users", { params: { q } })).data;
export const getAdminUserDetail = async (id) => (await api.get(`/admin/users/${id}`)).data;
export const updateAdminUser = async (id, data) => (await api.put(`/admin/users/${id}`, data)).data;
export const lockAdminUser = async (id, reason) => (await api.patch(`/admin/users/${id}/lock`, { reason })).data;
export const unlockAdminUser = async (id) => (await api.patch(`/admin/users/${id}/unlock`)).data;
export const deleteAdminUser = async (id) => (await api.delete(`/admin/users/${id}`)).data;
export const resetAdminUserPassword = async (id, newPassword) => (
  await api.post(`/admin/users/${id}/reset-password`, { newPassword })
).data;

export const getAdminAuth = async () => (await api.get("/admin/auth")).data;
export const revokeAdminSession = async (userId) => (await api.post(`/admin/auth/revoke/${userId}`)).data;

export const getAdminFriends = async (status = "") => (
  await api.get("/admin/friends", { params: status ? { status } : {} })
).data;
export const deleteAdminFriend = async (id) => (await api.delete(`/admin/friends/${id}`)).data;

export const getAdminMessages = async () => (await api.get("/admin/messages")).data;
export const getAdminMessageStats = async () => (await api.get("/admin/messages/stats")).data;

export const getAdminGroups = async () => (await api.get("/admin/groups")).data;
export const getAdminGroupDetail = async (id) => (await api.get(`/admin/groups/${id}`)).data;
export const lockAdminGroup = async (id, reason) => (await api.patch(`/admin/groups/${id}/lock`, { reason })).data;
export const deleteAdminGroup = async (id) => (await api.delete(`/admin/groups/${id}`)).data;

export const getAdminReports = async () => (await api.get("/admin/reports")).data;
export const getAdminStatistics = async () => (await api.get("/admin/statistics")).data;
