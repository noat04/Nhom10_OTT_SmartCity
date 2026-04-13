import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  const handleLogin = async () => {
    const res = await fetch('http://localhost:3000/api/auth/login/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (data.success) {
      alert("OTP đã gửi!")
      navigate('/otp', { state: { email, type: 'login' } })
    } else {
      alert(data.message)
    }
  }

  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h2>🔐 Đăng nhập</h2>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      /><br /><br />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      /><br /><br />

      <button onClick={handleLogin}>Đăng nhập</button>

      {/* 🔥 THÊM PHẦN NÀY */}
      <p>Bạn chưa có tài khoản?</p>
      <button onClick={() => navigate('/register')}>
        Đăng ký
      </button>
    </div>
  )
}