import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAPI, registerAPI } from "../api/authApi";
import { getSocket } from "../socket/socket";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { user, setUser, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigate = useNavigate();

  // ================= SOCKET SYNC =================
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUpdate = (data) => {
      if (user && data.user._id === user._id) {
        setUser(data.user);
      }
    };

    socket.on("user_updated", handleUpdate);

    return () => socket.off("user_updated", handleUpdate);
  }, [user, setUser]);

  // ================= VALIDATE =================
  const validate = () => {
    const newErrors = {};

    // EMAIL
    if (!email) {
      newErrors.email = "Email không được để trống";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Email không hợp lệ";
    }

    // PASSWORD
    if (!password) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu tối thiểu 6 ký tự";
    }

    // REGISTER
    if (!isLogin) {
      if (!username) {
        newErrors.username = "Username không được để trống";
      }

      if (!fullName) {
        newErrors.fullName = "Tên không được để trống";
      } else if (!/^[a-zA-ZÀ-ỹ\s]{2,50}$/.test(fullName)) {
        newErrors.fullName = "Tên không hợp lệ";
      }

      if (phone && !/^(0|\+84)[0-9]{9}$/.test(phone)) {
        newErrors.phone = "Số điện thoại không hợp lệ";
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = "Mật khẩu không khớp";
      }
    }

    return newErrors;
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // ===== LOGIN (KHÔNG OTP) =====
      if (isLogin) {
        const res = await loginAPI({ email, password });

        if (res.success) {
          login(res.user, res.token); // 🔥 dùng context

          alert("Đăng nhập thành công!");
          navigate("/", { replace: true });
        } else {
          setErrors({ general: res.message });
        }
      }

      // ===== REGISTER (CÓ OTP) =====
      else {
        const res = await registerAPI(email);

        if (res.success) {
          navigate("/otp", {
            state: {
              email,
              password,
              username,
              fullName,
              phone,
            },
          });
        } else {
          setErrors({ general: res.message });
        }
      }
    } catch (err) {
      setErrors({
        general: "Không thể kết nối server",
      });
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <div className="container-fluid vh-100 d-flex justify-content-center align-items-center bg-light">
      <div className="card p-4 shadow" style={{ width: "350px" }}>
        <h3 className="text-center mb-3">
          {isLogin ? "Đăng nhập" : "Đăng ký"}
        </h3>

        {/* ERROR CHUNG */}
        {errors.general && (
          <div className="alert alert-danger py-2 text-center">
            ⚠️ {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* REGISTER */}
          {!isLogin && (
            <>
              <input
                className={`form-control mb-1 ${
                  errors.username ? "is-invalid" : ""
                }`}
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              {errors.username && (
                <div className="text-danger mb-2">{errors.username}</div>
              )}

              <input
                className={`form-control mb-1 ${
                  errors.fullName ? "is-invalid" : ""
                }`}
                placeholder="Họ và tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              {errors.fullName && (
                <div className="text-danger mb-2">{errors.fullName}</div>
              )}

              <input
                className={`form-control mb-1 ${
                  errors.phone ? "is-invalid" : ""
                }`}
                placeholder="Số điện thoại"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {errors.phone && (
                <div className="text-danger mb-2">{errors.phone}</div>
              )}
            </>
          )}

          {/* EMAIL */}
          <input
            type="email"
            className={`form-control mb-1 ${
              errors.email ? "is-invalid" : ""
            }`}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && (
            <div className="text-danger mb-2">{errors.email}</div>
          )}

          {/* PASSWORD */}
          <input
            type="password"
            className={`form-control mb-1 ${
              errors.password ? "is-invalid" : ""
            }`}
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && (
            <div className="text-danger mb-2">{errors.password}</div>
          )}

          {/* CONFIRM */}
          {!isLogin && (
            <>
              <input
                type="password"
                className={`form-control mb-1 ${
                  errors.confirmPassword ? "is-invalid" : ""
                }`}
                placeholder="Xác nhận mật khẩu"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
              />
              {errors.confirmPassword && (
                <div className="text-danger mb-2">
                  {errors.confirmPassword}
                </div>
              )}
            </>
          )}

          <button className="btn btn-primary w-100 mt-2" disabled={loading}>
            {loading
              ? "Đang xử lý..."
              : isLogin
              ? "Đăng nhập"
              : "Gửi OTP đăng ký"}
          </button>
        </form>

        {/* SWITCH */}
        <div className="text-center mt-3">
          {isLogin ? (
            <div className="d-flex justify-content-center gap-2">
              <span
                onClick={() => setIsLogin(false)}
                style={{ cursor: "pointer", color: "blue" }}
              >
                Đăng ký
              </span>

              <span style={{ color: "#999" }}>|</span>

              <span
                onClick={() => navigate("/forgot-password")}
                style={{ cursor: "pointer", color: "red" }}
              >
                Quên mật khẩu?
              </span>
            </div>
          ) : (
            <span
              onClick={() => setIsLogin(true)}
              style={{ cursor: "pointer", color: "blue" }}
            >
              Đăng nhập
            </span>
          )}
        </div>
      </div>
    </div>
  );
}