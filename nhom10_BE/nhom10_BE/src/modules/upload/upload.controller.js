const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Khởi tạo S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

class UploadController {
    async getPresignedUrl(req, res) {
        try {
            const { fileName, fileType } = req.body;
            const userId = req.user.id;

            if (!fileName || !fileType) {
                return res.status(400).json({ success: false, message: "Thiếu thông tin file" });
            }

            // Tạo tên file độc nhất tránh trùng lặp (VD: 16892348_65a1b..._image.png)
            const uniqueFileName = `chats/${Date.now()}_${userId}_${fileName.replace(/\s+/g, '-')}`;

            // Cấu hình lệnh Upload
            const command = new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: uniqueFileName,
                ContentType: fileType, // Bắt buộc để S3 hiểu đây là ảnh/video thay vì file tải xuống
            });

            // Lấy URL ký trước (Có hiệu lực trong 60 giây)
            const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

            // URL cuối cùng để lưu vào Database sau khi upload xong
            const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;

            res.status(200).json({
                success: true,
                data: {
                    presignedUrl, // Link để Frontend dùng lệnh PUT upload file lên
                    fileUrl       // Link để Frontend gửi vào tin nhắn Chat
                }
            });

        } catch (error) {
            console.error("Lỗi tạo Presigned URL:", error);
            res.status(500).json({ success: false, message: "Lỗi Server khi tạo liên kết upload" });
        }
    }
}

module.exports = new UploadController();