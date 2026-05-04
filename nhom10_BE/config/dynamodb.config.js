// src/config/dynamodb.config.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
require("dotenv").config();

// Khởi tạo Client cơ bản
const client = new DynamoDBClient({
    region: process.env.AWS_REGION, // Ví dụ: 'ap-southeast-1'
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Bọc Client bằng DocumentClient để thao tác trực tiếp với Object JS (bỏ qua định dạng rườm rà của AWS)
const dynamoDB = DynamoDBDocumentClient.from(client);

module.exports = dynamoDB;