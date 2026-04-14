const authService = require('./auth.service');

// REGISTER
const registerSendOTP = async (req, res) => {
    try {
        const result = await authService.sendOTPRegister(req.body.email);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const registerVerifyOTP = async (req, res) => {
    try {
        const result = await authService.verifyRegister(req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// LOGIN
const loginSendOTP = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.sendOTPLogin(email, password);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const loginVerifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const result = await authService.verifyLogin(email, otp);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// USER
const getMe = async (req, res) => {
    try {
        const result = await authService.getMe(req.user.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
    try {
        const result = await authService.sendOTPReset(req.body.email);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const verifyResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const result = await authService.verifyOTPReset(email, otp);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const result = await authService.resetPassword(email, otp, newPassword);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const logout = async (req, res) => {
    try {
        const result = await authService.logout(req.user.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
module.exports = {
    registerSendOTP,
    registerVerifyOTP,
    loginSendOTP,
    loginVerifyOTP,
    getMe,
    forgotPassword,
    verifyResetOTP,
    resetPassword,
    logout
};