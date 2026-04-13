import { useState } from "react";

export default function AuthPage() {
  const [step, setStep] = useState("register");
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    fullName: ""
  });
  const [otp, setOtp] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ================= REGISTER =================
  const handleRegister = async () => {
    const res = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    const data = await res.json();

    if (data.success) {
      alert("OTP đã gửi về email!");
      setStep("otp");
    } else {
      alert(data.message);
    }
  };

  // ================= VERIFY OTP =================
  const handleVerify = async () => {
    const res = await fetch("http://localhost:3000/api/auth/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: form.email,
        otp
      })
    });

    const data = await res.json();

    if (data.success) {
      alert("Xác thực thành công!");
      setStep("login");
    } else {
      alert(data.message);
    }
  };

  // ================= LOGIN =================
  const handleLogin = async () => {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password
      })
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem("token", data.data.token);
      alert("Login thành công!");
    } else {
      alert(data.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto" }}>
      
      {step === "register" && (
        <>
          <h2>Đăng ký</h2>
          <input name="email" placeholder="Email" onChange={handleChange} />
          <input name="username" placeholder="Username" onChange={handleChange} />
          <input name="fullName" placeholder="Full name" onChange={handleChange} />
          <input name="password" type="password" placeholder="Password" onChange={handleChange} />
          <button onClick={handleRegister}>Đăng ký</button>
        </>
      )}

      {step === "otp" && (
        <>
          <h2>Nhập OTP</h2>
          <input placeholder="OTP" onChange={(e) => setOtp(e.target.value)} />
          <button onClick={handleVerify}>Xác thực</button>
        </>
      )}

      {step === "login" && (
        <>
          <h2>Đăng nhập</h2>
          <input name="email" placeholder="Email" onChange={handleChange} />
          <input name="password" type="password" placeholder="Password" onChange={handleChange} />
          <button onClick={handleLogin}>Đăng nhập</button>
        </>
      )}
    </div>
  );
}