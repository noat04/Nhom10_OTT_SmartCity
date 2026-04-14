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

  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // ================= VALIDATE =================
  const validateForm = () => {
    const { email, password, username, fullName } = form

    if (!email || !password || !username || !fullName) {
      alert("❌ Vui lòng nhập đầy đủ thông tin")
      return false
    }

    // check email đơn giản
    if (!email.includes("@")) {
      alert("❌ Email không hợp lệ")
      return false
    }

    if (password.length < 6) {
      alert("❌ Mật khẩu phải >= 6 ký tự")
      return false
    }

    if (username.length < 3) {
      alert("❌ Username phải >= 3 ký tự")
      return false
    }

    return true
  }

  // ================= SEND OTP =================
  const handleRegister = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)

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

    } catch (err) {
      alert("❌ Lỗi server")
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", textAlign: "center" }}>
      <h2>📝 Đăng ký</h2>

      <input
        name="email"
        placeholder="Email"
        onChange={handleChange}
      /><br /><br />

      <input
        name="username"
        placeholder="Username"
        onChange={handleChange}
      /><br /><br />

      <input
        name="fullName"
        placeholder="Full Name"
        onChange={handleChange}
      /><br /><br />

      <input
        name="password"
        type="password"
        placeholder="Password"
        onChange={handleChange}
      /><br /><br />

      <button onClick={handleRegister} disabled={loading}>
        {loading ? "Đang gửi..." : "Gửi OTP"}
      </button>

      <p>Đã có tài khoản?</p>
      <button onClick={() => navigate("/")}>Đăng nhập</button>
    </div>
  )
}