// config/s3.js
import 'dotenv/config'; // endret (assistant): sørger for at .env er lastet før vi leser process.env
import { S3Client } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-provider-ini"; // endret (assistant)

const region = process.env.AWS_REGION; // endret (assistant)

// endret (assistant): bruk lokal AWS-profil hvis ACCESS_KEY ikke er satt i env
let credentials; // endret (assistant)
if (!process.env.AWS_ACCESS_KEY_ID && process.env.AWS_PROFILE) { // endret (assistant)
  credentials = fromIni({ profile: process.env.AWS_PROFILE }); // endret (assistant)
}

export const s3 = new S3Client({
  region, // endret (assistant)
  ...(credentials ? { credentials } : {}), // endret (assistant)
  // creds kommer automatisk fra env eller IAM-rolle
});

export const BUCKET = process.env.S3_BUCKET;
