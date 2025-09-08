//Makes the application communicate with AWS S3-bucket

import 'dotenv/config'; 
import { S3Client } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-provider-ini"; 

const region = process.env.AWS_REGION; 

let credentials; 
if (!process.env.AWS_ACCESS_KEY_ID && process.env.AWS_PROFILE) { 
  credentials = fromIni({ profile: process.env.AWS_PROFILE }); 
}

export const s3 = new S3Client({
  region, 
  ...(credentials ? { credentials } : {}), 
});

export const BUCKET = process.env.S3_BUCKET;
