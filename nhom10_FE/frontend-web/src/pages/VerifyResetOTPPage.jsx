import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

export default function VerifyResetOTPPage() {
  const [otp, setOtp] = useState("")
  const { state } = useLocation()
  const navigate = useNavigate()

  const email = state?.email

  // 🔥 FIX: nếu không có email → quay về
  if (!email) {
    navigate("/forgot-password")
    return null
  }

  const handleVerify = async () => {
    if (!otp) {
      alert("Nhập OTP")
      return
    }

    try {
      const res = await fetch("http://localhost:3000/api/auth/verify-reset-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, otp })
      })

      const data = await res.json()

      if (data.success) {
        navigate("/reset-password", { state: { email, otp } })
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
      <h2>Nhập OTP</h2>

      <input
        placeholder="Nhập OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      <br /><br />

      <button onClick={handleVerify}>
        Xác nhận
      </button>
    </div>
  )
}