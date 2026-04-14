import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

export default function OTPPage() {
  const [otp, setOtp] = useState("")
  const location = useLocation()
  const navigate = useNavigate()

  // dữ liệu truyền từ page trước
  const { email, password, username, fullName, type } = location.state || {}

  // ================= VERIFY =================
  const handleVerify = async () => {
    try {
      let url = ""
      let body = {}

      // ================= REGISTER =================
      if (type === "register") {
        url = "http://localhost:3000/api/auth/register/verify"
        body = {
          email,
          otp,
          password,
          username,
          fullName
        }
      }

      // ================= LOGIN =================
      if (type === "login") {
        url = "http://localhost:3000/api/auth/login/verify"
        body = {
          email,
          otp
        }
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (data.success) {
        // login thì lưu token
        if (type === "login") {
          localStorage.setItem("token", data.token)
          alert("✅ Đăng nhập thành công!")
          navigate("/profile")
        } else {
          alert("✅ Đăng ký thành công!")
          navigate("/")
        }
      } else {
        alert(data.message)
      }
    } catch (err) {
      alert("Lỗi: " + err.message)
    }
  }

  // nếu vào trực tiếp không có data
  if (!email) {
    return <h3 style={{ textAlign: "center" }}>❌ Không có dữ liệu</h3>
  }

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", textAlign: "center" }}>
      <h2>🔢 Nhập OTP</h2>

      <p>Email: <b>{email}</b></p>

      <input
        placeholder="Nhập OTP"
        onChange={(e) => setOtp(e.target.value)}
      /><br /><br />

      <button onClick={handleVerify}>Xác thực</button>
    </div>
  )
}