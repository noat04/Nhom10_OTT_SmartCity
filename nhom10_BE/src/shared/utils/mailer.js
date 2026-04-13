const nodemailer = require("nodemailer");

const sendOTP = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,       // email gửi
            pass: process.env.EMAIL_PASS        // app password
        }
    });

    const mailOptions = {
        from: `"Your App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Mã OTP xác thực",
        html: `
            <h2>OTP của bạn là:</h2>
            <h1>${otp}</h1>
            <p>OTP có hiệu lực trong 5 phút</p>
        `
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendOTP };