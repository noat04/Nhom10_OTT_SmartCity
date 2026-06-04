import api from "../service/api.service";

export const getAdminDashboard = async () => (await api.get("/admin/dashboard")).data;
export const getAdminUsers = async (q = "", activity = "") => (
  await api.get("/admin/users", { params: { q, activity } })
).data;
export const getAdminUserDetail = async (id) => (await api.get(`/admin/users/${id}`)).data;
export const lockAdminUser = async (id, reason) => (await api.patch(`/admin/users/${id}/lock`, { reason })).data;
export const unlockAdminUser = async (id) => (await api.patch(`/admin/users/${id}/unlock`)).data;
export const deleteAdminUser = async (id) => (await api.delete(`/admin/users/${id}`)).data;

export const getAdminAuth = async () => (await api.get("/admin/auth")).data;
export const revokeAdminSession = async (userId) => (await api.post(`/admin/auth/revoke/${userId}`)).data;

export const getAdminMessages = async () => (await api.get("/admin/messages")).data;
export const getAdminMessageStats = async () => (await api.get("/admin/messages/stats")).data;

export const getAdminGroups = async (messageActivity = "") => (
  await api.get("/admin/groups", { params: { messageActivity } })
).data;
export const getAdminGroupDetail = async (id) => (await api.get(`/admin/groups/${id}`)).data;
export const lockAdminGroup = async (id, reason) => (await api.patch(`/admin/groups/${id}/lock`, { reason })).data;
export const unlockAdminGroup = async (id) => (await api.patch(`/admin/groups/${id}/unlock`)).data;
export const dissolveAdminGroup = async (id, reason) => (await api.patch(`/admin/groups/${id}/dissolve`, { reason })).data;
export const deleteAdminGroup = async (id, reason) => (await api.delete(`/admin/groups/${id}`, { data: { reason } })).data;

export const getAdminStatistics = async () => (await api.get("/admin/statistics")).data;
