import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const navigate = useNavigate()

  const handleSendOTP = async () => {
    if (!email) {
      alert("Vui lòng nhập email")
      return
    }

    try {
      const res = await fetch("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (data.success) {
        alert("OTP đã gửi về email")
        navigate("/verify-reset", { state: { email } })
      } else {
        alert(data.message)
      }
    } catch (err) {
      console.log(err)
      alert("Lỗi server")
    }
  }

  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h2>Quên mật khẩu</h2>

      <input
        placeholder="Nhập email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />

      <button onClick={handleSendOTP}>
        Gửi OTP
      </button>
    </div>
  )
}