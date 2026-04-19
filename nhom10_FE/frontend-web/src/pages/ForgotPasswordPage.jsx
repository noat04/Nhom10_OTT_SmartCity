import React, { useState, useRef } from "react";
import {
  forgotPasswordAPI,
  verifyResetOtpAPI,
  resetPasswordAPI,
} from "../api/authApi";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const inputsRef = useRef([]);

  // ================= STEP 1 =================
  const handleSendOtp = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await forgotPasswordAPI(email);

      if (res.success) {
        alert("📩 OTP đã gửi!");
        setStep(2);
      } else {
        alert(res.message);
      }
    } catch {
      alert("Lỗi server!");
    } finally {
      setLoading(false);
    }
  };

  // ================= OTP INPUT =================
  const handleChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    const data = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(data)) return;

    setOtp(data.split(""));
    inputsRef.current[5]?.focus();
  };

  // ================= STEP 2 =================
  const handleVerifyOtp = async () => {
    if (loading) return;

    const otpCode = otp.join("");
    if (otpCode.length !== 6) return alert("Nhập đủ 6 số OTP!");

    setLoading(true);

    try {
      const res = await verifyResetOtpAPI({ email, otp: otpCode });

      if (res.success) {
        alert("✅ OTP hợp lệ");
        setStep(3);
      } else {
        alert(res.message);
      }
    } catch {
      alert("Lỗi verify OTP!");
    } finally {
      setLoading(false);
    }
  };

  // ================= STEP 3 =================
  const handleResetPassword = async () => {
    if (loading) return;

    if (newPassword !== confirm) {
      return alert("Mật khẩu không khớp!");
    }

    setLoading(true);

    try {
      const res = await resetPasswordAPI({
        email,
        otp: otp.join(""),
        newPassword,
      });

      if (res.success) {
        alert("🎉 Đổi mật khẩu thành công!");
        window.location.href = "/login";
      } else {
        alert(res.message);
      }
    } catch {
      alert("Lỗi reset password!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="card p-4 shadow text-center" style={{ width: "360px" }}>
        <h4>Quên mật khẩu</h4>

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <>
            <input
              className="form-control mb-3"
              placeholder="Nhập email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              className="btn btn-primary w-100"
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? "Đang gửi..." : "Gửi OTP"}
            </button>
          </>
        )}

        {/* ================= STEP 2 (OTP 6 Ô) ================= */}
        {step === 2 && (
          <>
            <p className="text-muted small">Nhập OTP đã gửi tới email</p>

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
                  onPaste={handlePaste}
                  className="text-center fw-bold otp-box"
                />
              ))}
            </div>

            <button
              className="btn btn-success w-100"
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? "Đang xác thực..." : "Xác nhận OTP"}
            </button>
          </>
        )}

        {/* ================= STEP 3 ================= */}
        {step === 3 && (
          <>
            <input
              type="password"
              className="form-control mb-2"
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <input
              type="password"
              className="form-control mb-3"
              placeholder="Xác nhận mật khẩu"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            <button
              className="btn btn-danger w-100"
              onClick={handleResetPassword}
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </>
        )}
      </div>

      {/* STYLE OTP */}
      <style>{`
        .otp-box {
          width: 45px;
          height: 50px;
          font-size: 20px;
          border: 1px solid #ccc;
          border-radius: 10px;
          outline: none;
          transition: 0.2s;
        }

        .otp-box:focus {
          border-color: #0d6efd;
          box-shadow: 0 0 5px rgba(13,110,253,.5);
        }
      `}</style>
    </div>
  );
}
