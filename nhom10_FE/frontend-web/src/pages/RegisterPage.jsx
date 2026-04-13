import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    fullName: ""
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // ================= SEND OTP =================
  const handleRegister = async () => {
    const res = await fetch("http://localhost:3000/api/auth/register/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: form.email
      })
    })

    const data = await res.json()

    if (data.success) {
      alert("📩 OTP đã gửi về email!")

      // chuyển qua OTP page + truyền data
      navigate("/otp", {
        state: {
          email: form.email,
          password: form.password,
          username: form.username,
          fullName: form.fullName,
          type: "register"
        }
      })
    } else {
      alert(data.message)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", textAlign: "center" }}>
      <h2>📝 Đăng ký</h2>

      <input name="email" placeholder="Email" onChange={handleChange} /><br /><br />
      <input name="username" placeholder="Username" onChange={handleChange} /><br /><br />
      <input name="fullName" placeholder="Full Name" onChange={handleChange} /><br /><br />
      <input name="password" type="password" placeholder="Password" onChange={handleChange} /><br /><br />

      <button onClick={handleRegister}>Gửi OTP</button>

      <p>Đã có tài khoản?</p>
      <button onClick={() => navigate("/")}>Đăng nhập</button>
    </div>
  )
}