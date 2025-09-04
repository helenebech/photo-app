import Cognito from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";
import {clientId, clientSecret, username, confirmationCode} from "authSecrets.js"

function secretHash(clientId, clientSecret, username) {
  const hasher = crypto.createHmac('sha256', clientSecret);
  hasher.update(`${username}${clientId}`);
  return hasher.digest('base64');
}


async function main() {
    const client = new Cognito.CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
  const command2 = new Cognito.ConfirmSignUpCommand({
    ClientId: clientId,
    SecretHash: secretHash(clientId, clientSecret, username),
    Username: username,
    ConfirmationCode: confirmationCode,
  });

  const res2 = await client.send(command2);
  console.log(res2);

}

main();
