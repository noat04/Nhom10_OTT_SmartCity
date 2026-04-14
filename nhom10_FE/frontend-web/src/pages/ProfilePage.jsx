import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  const handleLogout = async () => {
    const token = localStorage.getItem("token")

    try {
      await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (err) {
      console.log("LOGOUT ERROR:", err)
    }

    localStorage.removeItem("token")
    navigate("/")
  }

  // ================= GET USER =================
  const fetchUser = async () => {
    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/")
      return
    }

    try {
      const res = await fetch("http://localhost:3000/api/users/profile", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()

      console.log("USER DATA:", data)

      if (data.success && data.user) {
        setUser(data.user)
      } else {
        localStorage.removeItem("token")
        navigate("/")
      }

    } catch (err) {
      console.log("FETCH ERROR:", err)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  if (!user) return <h3 style={{ textAlign: "center" }}>Loading...</h3>

  // ✅ FIX: avatar là STRING
  const avatar =
    user.avatar && user.avatar.startsWith("http")
      ? user.avatar
      : "https://via.placeholder.com/150"

  const cover =
    user.coverImage && user.coverImage.startsWith("http")
      ? user.coverImage
      : "https://via.placeholder.com/800x200"

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>

      {/* ===== COVER ===== */}
      <div style={{ position: "relative" }}>
        <img
          src={cover}
          alt="cover"
          style={{
            width: "100%",
            height: 200,
            objectFit: "cover"
          }}
        />

        {/* ===== AVATAR ===== */}
        <img
          src={avatar}
          alt="avatar"
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/150"
          }}
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            position: "absolute",
            bottom: -60,
            left: 20,
            border: "4px solid white",
            objectFit: "cover"
          }}
        />
      </div>

      {/* ===== INFO ===== */}
      <div style={{ marginTop: 70, padding: 20 }}>
        <h2>{user.fullName || "Chưa có tên"}</h2>

        <p><b>Username:</b> @{user.username}</p>

        <p><b>Bio:</b> {user.bio || "Chưa có giới thiệu"}</p>

        <p>📧 {user.email}</p>
        <p>📱 {user.phone || "Chưa có SĐT"}</p>

        <p>🟢 Trạng thái: {user.status}</p>

        <p>
          🕒 Last seen:{" "}
          {user.lastSeen
            ? new Date(user.lastSeen).toLocaleString()
            : "N/A"}
        </p>

        {/* ===== BUTTON ===== */}
        <button onClick={() => navigate("/edit-profile")}>
          ✏️ Chỉnh sửa
        </button>

        <button onClick={handleLogout} style={{ marginLeft: 10 }}>
          🚪 Đăng xuất
        </button>
      </div>
    </div>
  )
}