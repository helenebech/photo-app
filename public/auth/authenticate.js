import Cognito  from "@aws-sdk/client-cognito-identity-provider";
//import jwt from "aws-jwt-verify";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import crypto from "crypto";

const userPoolId = "ap-southeast-2_qVXLTJwBJ"; // Obtain from the AWS console
const clientId = "3trgv39k9aknpcl0p5bupbr1do";  // Obtain from the AWS console
const clientSecret = "15orh6gsnha8tnit642vju3pf918fggo9ukb5ggegli2175aieq2";  // Obtain from the AWS console
const username = "user2";
const password = "Supersecret1!";
const email = "marie.laukeland@gmail.com";

function secretHash(clientId, clientSecret, username) {
  const hasher = crypto.createHmac('sha256', clientSecret);
  hasher.update(`${username}${clientId}`);
  return hasher.digest('base64');
}

const accessVerifier = CognitoJwtVerifier.create({
  userPoolId: userPoolId,
  tokenUse: "access",
  clientId: clientId,
});

const idVerifier = CognitoJwtVerifier.create({
  userPoolId: userPoolId,
  tokenUse: "id",
  clientId: clientId,
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
      SECRET_HASH: secretHash(clientId, clientSecret, username),
    },
    ClientId: clientId,
    
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