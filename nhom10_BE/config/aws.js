// src/config/aws.js
const { S3Client } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
require('dotenv').config();

const awsConfig = {
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
};

// Khởi tạo S3 Client
const s3Client = new S3Client(awsConfig);

// Khởi tạo DynamoDB Client
const dynamoClient = new DynamoDBClient(awsConfig);
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

module.exports = {
    s3Client,
    dynamoDB
};