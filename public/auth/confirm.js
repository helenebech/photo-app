import Cognito from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";
import dotenv from "dotenv";

//user info
const username = "user2";
const password = "Supersecret1!";
const email = "marie.laukeland@gmail.com";
const confirmationCode = "640568";

//secret info from .env file
dotenv.config();
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN; 
const CLIENT_ID = process.env.COGNITO_CLIENT_ID; 
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET; 
const REDIRECT_URI = process.env.COGNITO_REDIRECT_URI;

function secretHash(clientId, clientSecret, username) {
  const hasher = crypto.createHmac('sha256', clientSecret);
  hasher.update(`${username}${clientId}`);
  return hasher.digest('base64');
}

async function main() {
    const client = new Cognito.CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
    const command2 = new Cognito.ConfirmSignUpCommand({
    ClientId: CLIENT_ID,
    SecretHash: secretHash(CLIENT_ID, CLIENT_SECRET, username),
    Username: username,
    ConfirmationCode: confirmationCode,
  });

  const res2 = await client.send(command2);
  console.log(res2);

}

main();
