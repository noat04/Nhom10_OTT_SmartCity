import api from "./api.service";

export const getMeAPI = () => api.get("/users/me");

export const updateMeAPI = (data) => api.put("/users/update", data);

export const updateAvatarAPI = (formData) =>
  api.post("/users/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });