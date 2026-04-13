import { useState } from 'react'
import './App.css'

function App() {
  const [step, setStep] = useState('login') // login | register | otp

  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    fullName: ''
  })

  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // ================= REGISTER =================
  const handleRegister = async () => {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })

    const data = await res.json()

    if (data.success) {
      setMessage('📩 OTP đã gửi về email!')
      setStep('otp')
    } else {
      setMessage(data.message)
    }
  }

  // ================= VERIFY OTP =================
  const handleVerify = async () => {
    const res = await fetch('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        otp
      })
    })

    const data = await res.json()

    if (data.success) {
      setMessage('✅ Xác thực thành công!')
      setStep('login')
    } else {
      setMessage(data.message)
    }
  }

  // ================= LOGIN =================
  const handleLogin = async () => {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password
      })
    })

    const data = await res.json()

    if (data.success) {
      localStorage.setItem('token', data.data.token)
      setMessage('✅ Đăng nhập thành công!')
    } else {
      setMessage(data.message)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '50px auto', textAlign: 'center' }}>
      
      {/* ================= LOGIN ================= */}
      {step === 'login' && (
        <>
          <h2>🔐 Đăng nhập</h2>
          <input name="email" placeholder="Email" onChange={handleChange} /><br /><br />
          <input name="password" type="password" placeholder="Password" onChange={handleChange} /><br /><br />

          <button onClick={handleLogin}>Đăng nhập</button>

          <p>Bạn chưa có tài khoản?</p>
          <button onClick={() => setStep('register')}>Đăng ký</button>
        </>
      )}

      {/* ================= REGISTER ================= */}
      {step === 'register' && (
        <>
          <h2>📝 Đăng ký</h2>
          <input name="email" placeholder="Email" onChange={handleChange} /><br /><br />
          <input name="username" placeholder="Username" onChange={handleChange} /><br /><br />
          <input name="fullName" placeholder="Full Name" onChange={handleChange} /><br /><br />
          <input name="password" type="password" placeholder="Password" onChange={handleChange} /><br /><br />

          <button onClick={handleRegister}>Đăng ký</button>

          <p>Đã có tài khoản?</p>
          <button onClick={() => setStep('login')}>Đăng nhập</button>
        </>
      )}

      {/* ================= OTP ================= */}
      {step === 'otp' && (
        <>
          <h2>🔢 Nhập OTP</h2>
          <input placeholder="Nhập OTP" onChange={(e) => setOtp(e.target.value)} /><br /><br />

          <button onClick={handleVerify}>Xác thực</button>
        </>
      )}

      <p style={{ marginTop: 20 }}>{message}</p>
    </div>
  )
}

export default App