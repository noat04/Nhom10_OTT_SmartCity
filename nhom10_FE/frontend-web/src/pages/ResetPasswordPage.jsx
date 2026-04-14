import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const { state } = useLocation()
  const navigate = useNavigate()

  const email = state?.email
  const otp = state?.otp

  // 🔥 FIX: nếu thiếu dữ liệu → quay lại
  if (!email || !otp) {
    navigate("/forgot-password")
    return null
  }

  const handleReset = async () => {
    if (!password) {
      alert("Nhập mật khẩu mới")
      return
    }

    try {
      const res = await fetch("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          otp,
          newPassword: password
        })
      })

      const data = await res.json()

      if (data.success) {
        alert("Đổi mật khẩu thành công")
        navigate("/")
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
      <h2>Mật khẩu mới</h2>

      <input
        type="password"
        placeholder="Nhập mật khẩu mới"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      <button onClick={handleReset}>
        Đổi mật khẩu
      </button>
    </div>
  )
}