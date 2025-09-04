import Cognito from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";

const clientId = "3trgv39k9aknpcl0p5bupbr1do";  // Obtain from the AWS console
const clientSecret = "15orh6gsnha8tnit642vju3pf918fggo9ukb5ggegli2175aieq2";  // Obtain from the AWS console
const username = "user2";
const confirmationCode = "219478"; // obtain from your email

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
