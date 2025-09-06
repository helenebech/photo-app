// config/s3.js
import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  // creds kommer automatisk fra env eller IAM-rolle
});

export const BUCKET = process.env.S3_BUCKET;