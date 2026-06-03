import React, { useRef, useState } from "react";
import {
  forgotPasswordAPI,
  resetPasswordAPI,
  verifyResetOtpAPI,
} from "../api/authApi";
import ForgotPasswordSteps from "../components/auth/ForgotPasswordSteps";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const inputsRef = useRef([]);

  const handleSendOtp = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await forgotPasswordAPI(email);
      if (res.success) {
        alert("OTP da gui!");
        setStep(2);
      } else {
        alert(res.message);
      }
    } catch {
      alert("Loi server!");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key !== "Backspace") return;

    if (otp[index]) {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    } else if (index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const data = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(data)) return;

    setOtp(data.split(""));
    inputsRef.current[5]?.focus();
  };

  const handleVerifyOtp = async () => {
    if (loading) return;

    const otpCode = otp.join("");
    if (otpCode.length !== 6) return alert("Nhap du 6 so OTP!");

    setLoading(true);

    try {
      const res = await verifyResetOtpAPI({ email, otp: otpCode });
      if (res.success) {
        alert("OTP hop le");
        setStep(3);
      } else {
        alert(res.message);
      }
    } catch {
      alert("Loi verify OTP!");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (loading) return;
    if (newPassword !== confirm) return alert("Mat khau khong khop!");

    setLoading(true);

    try {
      const res = await resetPasswordAPI({
        email,
        otp: otp.join(""),
        newPassword,
      });

      if (res.success) {
        alert("Doi mat khau thanh cong!");
        window.location.href = "/login";
      } else {
        alert(res.message);
      }
    } catch {
      alert("Loi reset password!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="card p-4 shadow text-center" style={{ width: "360px" }}>
        <h4>Quen mat khau</h4>
        <ForgotPasswordSteps
          step={step}
          loading={loading}
          email={email}
          setEmail={setEmail}
          otp={otp}
          inputsRef={inputsRef}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirm={confirm}
          setConfirm={setConfirm}
          onSendOtp={handleSendOtp}
          onVerifyOtp={handleVerifyOtp}
          onResetPassword={handleResetPassword}
          onOtpChange={handleOtpChange}
          onOtpKeyDown={handleOtpKeyDown}
          onOtpPaste={handleOtpPaste}
        />
      </div>

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
