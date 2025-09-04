import Cognito from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";
import {clientId, clientSecret, username, password, email} from "authSecrets.js"

function secretHash(clientId, clientSecret, username) {
  const hasher = crypto.createHmac('sha256', clientSecret);
  hasher.update(`${username}${clientId}`);
  return hasher.digest('base64');
}

async function main() {
  console.log("Signing up user");
  const client = new Cognito.CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
  const command = new Cognito.SignUpCommand({
    ClientId: clientId,
    SecretHash: secretHash(clientId, clientSecret, username),
    Username: username,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  });
  const res = await client.send(command);
  console.log(res);
}

main();