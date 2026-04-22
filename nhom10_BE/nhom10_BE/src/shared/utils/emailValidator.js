const dns = require('dns').promises;

// 🔹 check format
const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// 🔹 check domain tồn tại
const checkDomain = async (email) => {
    const domain = email.split('@')[1];
    try {
        const mx = await dns.resolveMx(domain);
        return mx && mx.length > 0;
    } catch {
        return false;
    }
};

// 🔹 chặn email rác
const blacklist = [
    "tempmail.com",
    "10minutemail.com",
    "mailinator.com"
];

const isDisposable = (email) => {
    const domain = email.split('@')[1];
    return blacklist.includes(domain);
};

module.exports = {
    isValidEmail,
    checkDomain,
    isDisposable
};