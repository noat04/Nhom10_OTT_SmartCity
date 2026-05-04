// const nodemailer = require("nodemailer");

// const sendOTP = async (email, otp, subject = "Mã OTP xác thực") => {
//     const transporter = nodemailer.createTransport({
//         service: "gmail",
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASS
//         }
//     });

//     await transporter.sendMail({
//         from: `"Your App" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject,
//         html: `
//             <h2>OTP của bạn là:</h2>
//             <h1>${otp}</h1>
//             <p>OTP có hiệu lực trong 5 phút</p>
//         `
//     });
// };

// module.exports = { sendOTP };
const nodemailer = require("nodemailer");

// 🔥 tạo transporter 1 lần (tối ưu)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ================= OTP =================
const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: `"Your App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Mã OTP xác thực",
    html: `
      <div style="font-family: Arial; text-align: center;">
        <h2>🔐 Xác thực OTP</h2>
        <p>Mã OTP của bạn là:</p>
        <h1 style="color: #0d6efd;">${otp}</h1>
        <p>OTP có hiệu lực trong 5 phút</p>
      </div>
    `,
  });
};

// ================= WARNING =================
const sendWarningEmail = async (email, message) => {
  await transporter.sendMail({
    from: `"Security Alert" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "⚠️ Cảnh báo bảo mật",
    html: `
      <div style="font-family: Arial;">
        <h2 style="color:red;">⚠️ Cảnh báo bảo mật</h2>
        <p>${message}</p>
        <p>Nếu đây không phải bạn, hãy đổi mật khẩu ngay!</p>
      </div>
    `,
  });
};

module.exports = { sendOTP, sendWarningEmail };