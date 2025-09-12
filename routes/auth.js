import express from 'express';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import Cognito from "@aws-sdk/client-cognito-identity-provider";

const router = express.Router();
const client = new Cognito.CognitoIdentityProviderClient({
    region: "ap-southeast-2",
  });

router.post('/login', async(req, res) => {
  const { username, password } = req.body || {};
    try {
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    });

    const response = await client.send(command);
    res.json({ token: response.AuthenticationResult.IdToken });
  } catch (err) {
    console.error("Cognito login error:", err);
    res.status(401).json({ error: err.message || "Invalid login" });
  }
});

export default router;