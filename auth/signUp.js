import Cognito from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";

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