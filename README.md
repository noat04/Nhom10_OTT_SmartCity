# 💬 Hệ Thống Ứng Dụng Chat Realtime Đa Nền Tảng

> Đồ án môn **Công nghệ mới trong Phát triển Ứng dụng CNTT**  
> Trường Đại học Công nghiệp TP.HCM — Nhóm 10

**Thành viên:**
- Nguyễn Danh Minh Toàn — 22645251
- Phạm Như Ý — 22644931
- Trần Quốc Đảm — 22642101

---

## 📌 Giới Thiệu

Hệ thống nhắn tin trực tuyến đa nền tảng (Web & Mobile), lấy cảm hứng từ các ứng dụng phổ biến như Zalo, Messenger. Dự án cung cấp đầy đủ chức năng của một ứng dụng chat hiện đại: nhắn tin realtime, gọi audio/video, quản lý nhóm, và tích hợp trợ lý AI.

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend

| Nền tảng | Công nghệ |
|---|---|
| Web | React + Vite |
| Mobile | Expo React Native |

### Backend

| Hạng mục | Công nghệ |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB Atlas + Mongoose |
| Realtime | Socket.IO |
| Video/Audio | WebRTC |
| File Storage | AWS S3 |
| Email / OTP | Nodemailer |
| AI Assistant | Google Gemini API |
| Auth | JWT (JSON Web Token) |

### Deployment

| Dịch vụ | Mục đích |
|---|---|
| Vercel | Deploy Frontend Web |
| Render | Deploy Backend API |
| MongoDB Atlas | Cloud Database |
| AWS S3 | Lưu trữ file, hình ảnh, video |

---

## ✅ Chức Năng Chính

### 🔐 Quản lý Tài khoản
- Đăng ký bằng email với xác thực OTP
- Đăng nhập / Đăng xuất
- Quên mật khẩu & đặt lại mật khẩu qua OTP
- Xem & cập nhật thông tin cá nhân (avatar, ảnh bìa)
- Hiển thị trạng thái online/offline

### 👥 Quản lý Bạn bè
- Tìm kiếm người dùng
- Gửi / chấp nhận / từ chối lời mời kết bạn
- Xem danh sách bạn bè, hồ sơ bạn bè, hủy kết bạn

### 💬 Chat Đơn (1-1)
- Nhắn tin văn bản realtime
- Gửi hình ảnh, video, tệp tin
- Chỉnh sửa, xóa, thu hồi, chuyển tiếp, trả lời tin nhắn
- Thả cảm xúc (reaction), ghim tin nhắn
- Tìm kiếm tin nhắn trong cuộc trò chuyện
- Typing indicator, trạng thái đã nhận / đã xem

### 👨‍👩‍👧 Chat Nhóm
- Tạo nhóm chat, thêm / xóa thành viên
- Phân quyền admin/member, chuyển quyền admin
- Cập nhật tên nhóm, ảnh nhóm
- Toàn bộ chức năng nhắn tin như chat đơn

### 📡 Realtime & Thông báo
- Cập nhật tin nhắn, thông báo tức thì qua Socket.IO
- Badge tin nhắn chưa đọc
- Thông báo kết bạn, tin nhắn mới, sự kiện hệ thống

### 📞 Gọi Audio/Video (1-1)
- Khởi tạo, chấp nhận, từ chối, kết thúc cuộc gọi
- Signaling qua Socket.IO, media stream qua WebRTC
- Lưu lịch sử cuộc gọi

### 🤖 Trợ lý AI
- Chat hỏi đáp với AI tích hợp Google Gemini
- Tạo / xem / xóa phiên hội thoại AI

### 🛡️ Quản trị (Admin)
- Dashboard thống kê hệ thống
- Quản lý người dùng: xem, khóa/mở khóa, xóa tài khoản
- Quản lý nhóm: xem, khóa/mở khóa, giải tán, xóa nhóm
- Quản lý phiên đăng nhập, thu hồi phiên
- Xem & thống kê tin nhắn

---

## 🚀 Hướng Phát Triển Tương Lai

### Nâng cấp Chức năng
- **Voice message** — gửi tin nhắn thoại trong cuộc trò chuyện
- **Sticker, GIF, emoji nâng cao** — tăng tính tương tác
- **Gọi nhóm audio/video** — mở rộng từ 1-1 lên nhiều người
- **Push notification** cho mobile qua Firebase Cloud Messaging / Expo Push Notification
- **Tìm kiếm nâng cao** — lọc theo thời gian, người gửi, loại file
- **AI nâng cao** — tóm tắt hội thoại, gợi ý phản hồi, tìm kiếm thông minh
- **Báo cáo nội dung xấu**, chặn người dùng, kiểm duyệt nhóm

### Cải thiện Bảo mật
- **Mã hóa đầu cuối (E2E Encryption)** cho tin nhắn riêng tư
- **Refresh token + access token ngắn hạn**, cơ chế thu hồi token
- **Xác thực 2 lớp (2FA)** qua OTP hoặc ứng dụng xác thực
- **Rate limiting** cho API đăng nhập, OTP, reset mật khẩu
- **Security logging** — theo dõi đăng nhập bất thường, cảnh báo người dùng

### Tối ưu Hệ thống
- **Redis cache** — cache danh sách online, session, unread count
- **Redis Adapter cho Socket.IO** — scale realtime trên nhiều server instance
- **Index MongoDB** cho các collection lớn (Message, Conversation, Notification)
- **Load balancing & auto-scaling** — sẵn sàng cho môi trường production quy mô lớn
- **CI/CD pipeline** — tự động hóa kiểm thử và triển khai

---

## 🏗️ Kiến trúc Hệ thống

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────┐
│  React Web  │    │  Expo React     │    │   Admin      │
│  (Vercel)   │    │  Native Mobile  │    │   Dashboard  │
└──────┬──────┘    └───────┬─────────┘    └──────┬───────┘
       │                   │                      │
       └───────────────────┼──────────────────────┘
                           │ REST API + Socket.IO
                    ┌──────▼──────────┐
                    │  Node.js /      │
                    │  Express.js     │
                    │  (Render)       │
                    └──────┬──────────┘
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼───────┐
   │  MongoDB    │  │   AWS S3    │  │  Gemini AI  │
   │  Atlas      │  │  (Storage)  │  │  (Google)   │
   └─────────────┘  └─────────────┘  └─────────────┘
```

---

*Đồ án được hoàn thiện và deploy thành công — Nhóm 10, 2025*
