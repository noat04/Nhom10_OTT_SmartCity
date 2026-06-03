import api from "./api.service";

export const getMeAPI = () => api.get("/users/me");

export const updateMeAPI = (data) => api.put("/users/update", data);

export const updateAvatarAPI = (formData) =>
  api.post("/users/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const updatePasswordAPI = (data) => api.put("/users/password", data);

export const updateCoverAPI = (formData) =>
  api.post("/users/cover", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const deleteMeAPI = () => api.delete("/users/me");

export const searchUsersProfileAPI = (search) =>
  api.get("/users/search", { params: { search } });
