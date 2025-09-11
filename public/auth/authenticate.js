import Cognito  from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import crypto from "crypto";
import dotenv from 'dotenv';

//user info
const username = "user2";
const password = "Supersecret1!";
const email = "marie.laukeland@gmail.com";

dotenv.config();
const CLIENT_ID = process.env.COGNITO_CLIENT_ID; 
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET; 
const USERPOOL_ID = process.env.COGNITO_USERPOOL_ID;

function secretHash(clientId, clientSecret, username) {
  const hasher = crypto.createHmac('sha256', clientSecret);
  hasher.update(`${username}${clientId}`);
  return hasher.digest('base64');
}

const accessVerifier = CognitoJwtVerifier.create({
  userPoolId: USERPOOL_ID,
  tokenUse: "access",
  clientId: CLIENT_ID,
});

const idVerifier = CognitoJwtVerifier.create({
  userPoolId: USERPOOL_ID,
  tokenUse: "id",
  clientId: CLIENT_ID,
});

async function main() {
  const client = new Cognito.CognitoIdentityProviderClient({
    region: "ap-southeast-2",
  });

  console.log("Getting auth token");

  // Get authentication tokens from the Cognito API using username and password
  const command = new Cognito.InitiateAuthCommand({
    AuthFlow: Cognito.AuthFlowType.USER_PASSWORD_AUTH,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
      SECRET_HASH: secretHash(CLIENT_ID, CLIENT_SECRET, username),
    },
    ClientId: CLIENT_ID,
    
  });

  const res = await client.send(command);
  console.log(res);

  // ID Tokens are used to authenticate users to your application
  const IdToken = res.AuthenticationResult.IdToken;
  const IdTokenVerifyResult = await idVerifier.verify(IdToken);
  console.log(IdTokenVerifyResult);

  // Access tokens are used to link IAM roles to identities for accessing AWS services
  // Most students will not use these
  const accessToken = res.AuthenticationResult.AccessToken;
  const accessTokenVerifyResult = await accessVerifier.verify(accessToken);
  console.log(accessTokenVerifyResult);
}

main();
