import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyOtpAPI } from "../api/authApi";
import OtpInputs from "../components/auth/OtpInputs";

const otpInputStyle = {
  width: "40px",
  height: "45px",
  fontSize: "20px",
  border: "1px solid #ccc",
  borderRadius: "8px",
};

export default function OtpPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const inputsRef = useRef([]);
  const dataFromAuth = location.state;

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

  const handleVerify = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!dataFromAuth) return alert("Du lieu khong hop le!");

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      return alert("Vui long nhap du 6 so OTP!");
    }

    setLoading(true);

    try {
      const res = await verifyOtpAPI("/auth/register/verify", {
        email: dataFromAuth.email,
        password: dataFromAuth.password,
        username: dataFromAuth.username,
        fullName: dataFromAuth.fullName,
        phone: dataFromAuth.phone,
        otp: otpCode,
      });

      if (res.success) {
        alert("Dang ky thanh cong!");
        navigate("/auth", { replace: true });
      } else {
        alert(res.message || "OTP khong dung!");
      }
    } catch (err) {
      console.error(err);
      alert("Loi xac thuc OTP!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="card p-4 shadow text-center" style={{ width: "350px" }}>
        <h4>Xac thuc OTP dang ky</h4>
        <p className="text-muted">
          Email: <b>{dataFromAuth?.email}</b>
        </p>

        <OtpInputs
          otp={otp}
          inputsRef={inputsRef}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={otpInputStyle}
        />

        <button onClick={handleVerify} className="btn btn-success w-100" disabled={loading}>
          {loading ? "Dang xac thuc..." : "Xac nhan"}
        </button>

        <button className="btn btn-link mt-2" onClick={() => navigate(-1)}>
          Quay lai
        </button>
      </div>
    </div>
  );
}
