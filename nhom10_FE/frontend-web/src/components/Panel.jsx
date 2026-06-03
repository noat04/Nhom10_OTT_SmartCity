import React, { useEffect, useState } from "react";
import { FaCommentDots, FaUsers, FaSignOutAlt, FaRobot } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { updateProfile, updateAvatar, updatePassword, deleteMyAccount } from "../api/userApi";
import { disconnectSocket } from "../socket/socket";

export default function Panel({
  tab,
  setTab,
  setFriendSection,
  hasNewFriendRequest,
}) {
  const { user, setUser } = useAuth();

  const [showProfile, setShowProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [newAvatarFile, setNewAvatarFile] = useState(null);

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    bio: "",
    avatarPreview: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const logout = () => {
    localStorage.clear();
    setUser(null);
    disconnectSocket();
    window.location.href = "/login";
  };

  useEffect(() => {
    if (!user) return;

    setForm({
      fullName: user.fullName || "",
      phone: user.phone || "",
      bio: user.bio || "",
      avatarPreview: user.avatar || "",
    });
  }, [user, showProfile]);

  useEffect(() => {
    if (!success && Object.keys(errors).length === 0) return;

    const timer = setTimeout(() => {
      setErrors({});
      setSuccess("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [errors, success]);

  if (!user) return null;

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors({ avatar: "Chỉ được chọn file ảnh" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors({ avatar: "Ảnh tối đa 2MB" });
      return;
    }

    setNewAvatarFile(file);

    setForm((prev) => ({
      ...prev,
      avatarPreview: URL.createObjectURL(file),
    }));

    setErrors((prev) => ({ ...prev, avatar: "" }));
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      password: "",
      general: "",
    }));
  };

  const handleUpdatePassword = async () => {
    setSuccess("");

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setErrors({ password: "Vui long nhap day du thong tin mat khau" });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setErrors({ password: "Mat khau moi toi thieu 6 ky tu" });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrors({ password: "Mat khau moi va xac nhan mat khau khong khop" });
      return;
    }

    setErrors({});
    setIsPasswordLoading(true);

    const res = await updatePassword(passwordForm);

    if (!res?.success) {
      setErrors({ password: res?.message || "Doi mat khau that bai" });
      setIsPasswordLoading(false);
      return;
    }

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setSuccess(res?.message || "Doi mat khau thanh cong!");
    setIsPasswordLoading(false);
  };

  const handleSaveProfile = async () => {
    setSuccess("");

    const newErrors = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = "Tên không được để trống";
    } else if (form.fullName.trim().length < 2) {
      newErrors.fullName = "Tên tối thiểu 2 ký tự";
    }

    if (form.phone && !/^(0|\+84)[0-9]{9}$/.test(form.phone)) {
      newErrors.phone = "Số điện thoại không hợp lệ";
    }

    if (form.bio.length > 150) {
      newErrors.bio = "Bio tối đa 150 ký tự";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      let updatedUser = user;

      if (newAvatarFile) {
        const avatarRes = await updateAvatar(newAvatarFile);

        if (!avatarRes?.success) {
          setErrors({ avatar: avatarRes?.message || "Cập nhật ảnh thất bại" });
          setIsLoading(false);
          return;
        }

        updatedUser = avatarRes?.user || avatarRes?.data?.user || updatedUser;
      }

      const profileRes = await updateProfile({
        fullName: form.fullName,
        phone: form.phone,
        bio: form.bio,
      });

      if (!profileRes?.success) {
        setErrors({ general: profileRes?.message || "Cập nhật thất bại" });
        setIsLoading(false);
        return;
      }

      updatedUser = profileRes?.user || profileRes?.data?.user || updatedUser;

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setForm({
        fullName: updatedUser.fullName || "",
        phone: updatedUser.phone || "",
        bio: updatedUser.bio || "",
        avatarPreview: updatedUser.avatar || "",
      });

      setIsEditing(false);
      setNewAvatarFile(null);
      setSuccess("Cập nhật thành công!");
    } catch (err) {
      setErrors({
        general: err?.response?.data?.message || "Có lỗi xảy ra!",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Xoa tai khoan? Tai khoan se bi danh dau da xoa va khong the dang nhap tiep.")) return;

    const res = await deleteMyAccount();
    if (!res?.success) {
      setErrors({ general: res?.message || "Xoa tai khoan that bai" });
      return;
    }

    logout();
  };

  const avatarSrc =
    form.avatarPreview ||
    user.avatar ||
    `https://ui-avatars.com/api/?name=${user.username || "U"}`;

  return (
    <>
      <div
        className="bg-primary d-flex flex-column justify-content-between align-items-center py-3"
        style={{ width: "60px" }}
      >
        <div className="d-flex flex-column align-items-center">
          <img
            src={avatarSrc}
            className="rounded-circle mb-3"
            width="40"
            height="40"
            style={{ cursor: "pointer", objectFit: "cover" }}
            onClick={() => setShowProfile(true)}
            alt="avatar"
          />

          {/* TAB CHAT */}
          <button
            className={`btn text-white mb-3 ${tab === "chat" ? "fw-bold" : ""}`}
            onClick={() => setTab("chat")}
            title="Tin nhắn"
          >
            <FaCommentDots size={20} />
          </button>

          {/* TAB BẠN BÈ */}
          <div className="position-relative mb-3">
            <button
              className={`btn text-white ${tab === "friends" ? "fw-bold" : ""}`}
              onClick={() => {
                setTab("friends");
                setFriendSection("friends");
              }}
              title="Bạn bè"
            >
              <FaUsers size={20} />
            </button>

            {hasNewFriendRequest && (
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  right: 4,
                  width: 10,
                  height: 10,
                  background: "red",
                  borderRadius: "50%",
                  border: "2px solid white",
                }}
              />
            )}
          </div>

          {/* TAB AI TRỢ LÝ ẢO */}
          <button
            className={`btn text-white mb-3 ${tab === "ai" ? "fw-bold" : ""}`}
            onClick={() => setTab("ai")}
            title="Trợ lý AI"
          >
            <FaRobot size={22} color={tab === "ai" ? "#ffc107" : "white"} />
          </button>
        </div>

        <button className="btn text-white" onClick={logout} title="Đăng xuất">
          <FaSignOutAlt size={20} />
        </button>
      </div>

      {showProfile && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 9999 }}
          onClick={() => !isEditing && setShowProfile(false)}
        >
          <div
            className="bg-white p-4 rounded shadow text-center"
            style={{ width: "350px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="fw-bold mb-3">Thông tin cá nhân</h5>

            {errors.general && (
              <div className="alert alert-danger py-1">{errors.general}</div>
            )}

            {success && (
              <div className="alert alert-success py-1">{success}</div>
            )}

            <img
              src={avatarSrc}
              className="rounded-circle mb-2"
              width="80"
              height="80"
              alt="avatar"
              style={{ objectFit: "cover" }}
            />

            {errors.avatar && (
              <div className="text-danger small mb-2">{errors.avatar}</div>
            )}

            {isEditing && (
              <input
                type="file"
                className="form-control mb-3"
                onChange={handleAvatarChange}
              />
            )}

            <input
              className="form-control mb-2"
              value={user.username || ""}
              disabled
            />

            <input
              placeholder="Full name"
              className={`form-control mb-1 ${errors.fullName ? "is-invalid" : ""
                }`}
              value={form.fullName}
              disabled={!isEditing}
              onChange={(e) => handleChange("fullName", e.target.value)}
            />
            {errors.fullName && (
              <div className="text-danger small mb-2">{errors.fullName}</div>
            )}

            <input
              className="form-control mb-3"
              value={user.email || ""}
              disabled
            />

            <input
              placeholder="Phone"
              className={`form-control mb-1 ${errors.phone ? "is-invalid" : ""
                }`}
              value={form.phone}
              disabled={!isEditing}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
            {errors.phone && (
              <div className="text-danger small mb-2">{errors.phone}</div>
            )}

            <textarea
              placeholder="Bio"
              className={`form-control mb-1 ${errors.bio ? "is-invalid" : ""}`}
              value={form.bio}
              disabled={!isEditing}
              onChange={(e) => handleChange("bio", e.target.value)}
            />
            {errors.bio && (
              <div className="text-danger small mb-2">{errors.bio}</div>
            )}

            <div className="text-start mt-3 pt-3 border-top">
              <div className="fw-semibold mb-2">Doi mat khau</div>

              <input
                type="password"
                placeholder="Mat khau hien tai"
                className="form-control mb-2"
                value={passwordForm.currentPassword}
                onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
              />

              <input
                type="password"
                placeholder="Mat khau moi"
                className="form-control mb-2"
                value={passwordForm.newPassword}
                onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
              />

              <input
                type="password"
                placeholder="Nhap lai mat khau moi"
                className="form-control mb-2"
                value={passwordForm.confirmPassword}
                onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
              />

              {errors.password && (
                <div className="text-danger small mb-2">{errors.password}</div>
              )}

              <button
                className="btn btn-outline-primary w-100"
                onClick={handleUpdatePassword}
                disabled={isPasswordLoading}
              >
                {isPasswordLoading ? "Dang doi..." : "Cap nhat mat khau"}
              </button>
            </div>

            <div className="d-flex justify-content-between mt-3">
              {isEditing ? (
                <button
                  className="btn btn-success w-50 me-1"
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                >
                  {isLoading ? "Đang lưu..." : "Lưu"}
                </button>
              ) : (
                <button
                  className="btn btn-primary w-50 me-1"
                  onClick={() => setIsEditing(true)}
                >
                  Sửa
                </button>
              )}

              <button
                className="btn btn-secondary w-50 ms-1"
                onClick={() => {
                  setShowProfile(false);
                  setIsEditing(false);
                  setNewAvatarFile(null);
                  setErrors({});
                  setSuccess("");
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                  setForm({
                    fullName: user.fullName || "",
                    phone: user.phone || "",
                    bio: user.bio || "",
                    avatarPreview: user.avatar || "",
                  });
                }}
              >
                Đóng
              </button>
            </div>

            {!isEditing && (
              <button
                className="btn btn-outline-danger w-100 mt-3"
                onClick={handleDeleteAccount}
              >
                Xoa tai khoan
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
