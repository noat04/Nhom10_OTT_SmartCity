const nodemailer = require("nodemailer");

const sendOTP = async (email, otp, subject = "Mã OTP xác thực") => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: `"Your App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html: `
            <h2>OTP của bạn là:</h2>
            <h1>${otp}</h1>
            <p>OTP có hiệu lực trong 5 phút</p>
        `
    });
};

module.exports = { sendOTP };