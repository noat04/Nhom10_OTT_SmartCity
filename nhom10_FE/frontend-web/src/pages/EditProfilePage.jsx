import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

export default function EditProfilePage() {
  const [user, setUser] = useState({})
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)

  const [avatarPreview, setAvatarPreview] = useState("")
  const [coverPreview, setCoverPreview] = useState("")

  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  // ================= LOAD USER =================
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

      console.log("USER:", data)

      if (data.success && data.user) {
        setUser(data.user)

        // ✅ FIX: avatar là STRING
        setAvatarPreview(data.user.avatar || "")
        setCoverPreview(data.user.coverImage || "")
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

  // ================= INPUT =================
  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value })
  }

  // ================= PREVIEW IMAGE =================
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    setAvatarFile(file)

    if (file) {
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    setCoverFile(file)

    if (file) {
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  // ================= UPDATE =================
  const handleUpdate = async () => {
    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/")
      return
    }

    try {
      setLoading(true)

      // ===== UPDATE TEXT =====
      const res1 = await fetch("http://localhost:3000/api/users/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: user.fullName,
          phone: user.phone,
          bio: user.bio
        })
      })

      const data1 = await res1.json()
      console.log("UPDATE TEXT:", data1)

      // ===== UPLOAD AVATAR =====
      if (avatarFile) {
        const formData = new FormData()
        formData.append("avatar", avatarFile)

        const res2 = await fetch("http://localhost:3000/api/users/avatar", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        })

        const data2 = await res2.json()
        console.log("UPLOAD AVATAR:", data2)
      }

      // ===== UPLOAD COVER =====
      if (coverFile) {
        const formData = new FormData()
        formData.append("cover", coverFile)

        const res3 = await fetch("http://localhost:3000/api/users/cover", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        })

        const data3 = await res3.json()
        console.log("UPLOAD COVER:", data3)
      }

      alert("✅ Cập nhật thành công!")
      navigate("/profile")

    } catch (err) {
      console.log("UPDATE ERROR:", err)
      alert("❌ Lỗi khi cập nhật")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: "50px auto", textAlign: "center" }}>
      <h2>✏️ Chỉnh sửa tài khoản</h2>

      {/* ===== COVER PREVIEW ===== */}
      <div>
        <img
          src={coverPreview || "https://via.placeholder.com/800x200"}
          alt="cover"
          style={{ width: "100%", height: 150, objectFit: "cover" }}
        />
      </div>

      {/* ===== AVATAR PREVIEW ===== */}
      <div style={{ marginTop: -40 }}>
        <img
          src={avatarPreview || "https://via.placeholder.com/150"}
          alt="avatar"
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/150"
          }}
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            border: "3px solid white",
            objectFit: "cover"
          }}
        />
      </div>

      <br />

      {/* ===== TEXT ===== */}
      <input
        name="fullName"
        value={user.fullName || ""}
        placeholder="Họ tên"
        onChange={handleChange}
      /><br /><br />

      <input
        name="phone"
        value={user.phone || ""}
        placeholder="SĐT"
        onChange={handleChange}
      /><br /><br />

      <input
        name="bio"
        value={user.bio || ""}
        placeholder="Bio"
        onChange={handleChange}
      /><br /><br />

      {/* ===== UPLOAD AVATAR ===== */}
      <p>📸 Avatar:</p>
      <input type="file" accept="image/*" onChange={handleAvatarChange} />

      {/* ===== UPLOAD COVER ===== */}
      <p>🖼 Cover:</p>
      <input type="file" accept="image/*" onChange={handleCoverChange} />

      <br /><br />

      <button onClick={handleUpdate} disabled={loading}>
        {loading ? "Đang cập nhật..." : "💾 Lưu thay đổi"}
      </button>
    </div>
  )
}