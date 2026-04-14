const { 
    S3Client, 
    PutObjectCommand, 
    DeleteObjectCommand 
} = require("@aws-sdk/client-s3");

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
    }
});

// ================= HELPER =================
const getKeyFromUrl = (url) => {
    if (!url) return null;

    try {
        const parts = url.split(".amazonaws.com/");
        return parts[1]; // users/xxxx.jpg
    } catch {
        return null;
    }
};

// ================= UPLOAD =================
const uploadFile = async (fileBuffer, fileName, mimeType) => {
    const key = `users/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType
    });

    await s3.send(command);

    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // 🔥 CHỈ TRẢ URL (đúng với model)
    return url;
};

// ================= DELETE =================
const deleteFileByUrl = async (url) => {
    const key = getKeyFromUrl(url);

    if (!key) return;

    const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
    });

    await s3.send(command);
};

module.exports = {
    uploadFile,
    deleteFileByUrl,
    getKeyFromUrl // (optional nếu cần dùng ngoài)
};