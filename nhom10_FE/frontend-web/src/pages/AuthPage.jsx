import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginAPI, registerAPI } from "../api/authApi";
import { getSocket } from "../socket/socket";
import { useAuth } from "../context/AuthContext";
import AuthForm from "../components/auth/AuthForm";
import AuthSwitch from "../components/auth/AuthSwitch";

const initialForm = {
  email: "",
  password: "",
  username: "",
  fullName: "",
  phone: "",
  confirmPassword: "",
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(initialForm);

  const { user, setUser, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.email) {
      newErrors.email = "Email khong duoc de trong";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      newErrors.email = "Email khong hop le";
    }

    if (!form.password) {
      newErrors.password = "Mat khau khong duoc de trong";
    } else if (form.password.length < 6) {
      newErrors.password = "Mat khau toi thieu 6 ky tu";
    }

    if (!isLogin) {
      if (!form.username) newErrors.username = "Username khong duoc de trong";

      if (!form.fullName) {
        newErrors.fullName = "Ten khong duoc de trong";
      } else if (!/^[a-zA-ZÀ-ỹ\s]{2,50}$/.test(form.fullName)) {
        newErrors.fullName = "Ten khong hop le";
      }

      if (form.phone && !/^(0|\+84)[0-9]{9}$/.test(form.phone)) {
        newErrors.phone = "So dien thoai khong hop le";
      }

      if (form.password !== form.confirmPassword) {
        newErrors.confirmPassword = "Mat khau khong khop";
      }
    }

    return newErrors;
  };

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
      if (isLogin) {
        const res = await loginAPI({
          email: form.email,
          password: form.password,
        });

        if (res.success) {
          login(res.user, res.token);
          alert("Dang nhap thanh cong!");
          const isAdmin = res.user?.role === "admin" || res.user?.isAdmin;
          const redirectTo = location.state?.from || (isAdmin ? "/admin" : "/");
          navigate(redirectTo, { replace: true });
        } else {
          setErrors({ general: res.message });
        }
      } else {
        const res = await registerAPI(form.email);

        if (res.success) {
          navigate("/otp", {
            state: {
              email: form.email,
              password: form.password,
              username: form.username,
              fullName: form.fullName,
              phone: form.phone,
            },
          });
        } else {
          setErrors({ general: res.message });
        }
      }
    } catch {
      setErrors({ general: "Khong the ket noi server" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex justify-content-center align-items-center bg-light">
      <div className="card p-4 shadow" style={{ width: "350px" }}>
        <h3 className="text-center mb-3">
          {isLogin ? "Dang nhap" : "Dang ky"}
        </h3>

        {errors.general && (
          <div className="alert alert-danger py-2 text-center">
            {errors.general}
          </div>
        )}

        <AuthForm
          isLogin={isLogin}
          loading={loading}
          errors={errors}
          form={form}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
        />

        <AuthSwitch
          isLogin={isLogin}
          onSwitchMode={setIsLogin}
          onForgotPassword={() => navigate("/forgot-password")}
        />
      </div>
    </div>
  );
}
