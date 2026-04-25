import React, { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyOtpAPI } from "../api/authApi";

export default function OtpPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const inputsRef = useRef([]);

  const dataFromAuth = location.state;

  // ===== handle input OTP =====
  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  // ===== VERIFY OTP (CHỈ REGISTER) =====
  const handleVerify = async (e) => {
    e.preventDefault();

    if (loading) return;
    if (!dataFromAuth) return alert("Dữ liệu không hợp lệ!");

    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      return alert("Vui lòng nhập đủ 6 số OTP!");
    }

    setLoading(true);

    try {
      const endpoint = "/auth/register/verify"; // 🔥 chỉ register

      const payload = {
        email: dataFromAuth.email,
        password: dataFromAuth.password,
        username: dataFromAuth.username,
        fullName: dataFromAuth.fullName,
        phone: dataFromAuth.phone,
        otp: otpCode,
      };

      const res = await verifyOtpAPI(endpoint, payload);

      if (res.success) {
        alert("Đăng ký thành công!");
        navigate("/auth", { replace: true });
      } else {
        alert(res.message || "OTP không đúng!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi xác thực OTP!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="card p-4 shadow text-center" style={{ width: "350px" }}>
        <h4>Xác thực OTP đăng ký</h4>

        <p className="text-muted">
          Email: <b>{dataFromAuth?.email}</b>
        </p>

        {/* OTP BOXES */}
        <div className="d-flex justify-content-center gap-2 mb-3">
          {otp.map((value, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              type="text"
              maxLength={1}
              value={value}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="text-center fw-bold"
              style={{
                width: "40px",
                height: "45px",
                fontSize: "20px",
                border: "1px solid #ccc",
                borderRadius: "8px",
              }}
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          className="btn btn-success w-100"
          disabled={loading}
        >
          {loading ? "Đang xác thực..." : "Xác nhận"}
        </button>

        <button className="btn btn-link mt-2" onClick={() => navigate(-1)}>
          Quay lại
        </button>
      </div>
    </div>
  );
}