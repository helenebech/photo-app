import Cognito from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";
import dotenv from 'dotenv';

//user info
const username = "user2";
const password = "Supersecret1!";
const email = "marie.laukeland@gmail.com";

dotenv.config();
const CLIENT_ID = process.env.COGNITO_CLIENT_ID; 
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET; 


function secretHash(clientId, clientSecret, username) {
  const hasher = crypto.createHmac('sha256', clientSecret);
  hasher.update(`${username}${clientId}`);
  return hasher.digest('base64');
}

async function main() {
  console.log("Signing up user");
  const client = new Cognito.CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
  const command = new Cognito.SignUpCommand({
    ClientId: CLIENT_ID,
    SecretHash: secretHash(CLIENT_ID, CLIENT_SECRET, username),
    Username: username,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  });
  const res = await client.send(command);
  console.log(res);
}

main();

  //må sende inn confirmation code for sign up
  //så kjøre confirmation.js