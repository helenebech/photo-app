import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import {Issuer, generators} from 'openid-client';

import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import commentRoutes from './routes/comments.js';
//import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const client = new CognitoIdentityProviderClient({ region: 'ap-southeast-2' });

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

//authentication check
function checkAuth (req, res, next) {
    if (!req.session.userInfo) {
        req.isAuthenticated = false;
    } else {
        req.isAuthenticated = true;
    }
    next();
};

//static files
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

async function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];
  try {
    req.user = await verifier.verify(token);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

//pages
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/app', checkAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const command = new SignUpCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: username,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }]
    });

    const response = await client.send(command);
    res.json(response);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Confirm signup
app.post("/confirm", async (req, res) => {
  const { username, code } = req.body;

  try {
    const command = new ConfirmSignUpCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: username,
      ConfirmationCode: code
    });

    const response = await client.send(command);
    res.json(response);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Authenticate (login)
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

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
    res.json(response.AuthenticationResult); // contains IdToken & AccessToken
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// app.get('/login', (req, res) => {
//     const nonce = generators.nonce();
//     const state = generators.state();

//     req.session.nonce = nonce;
//     req.session.state = state;

//     const authUrl = client.authorizationUrl({
//         scope: 'phone openid email',
//         state: state,
//         nonce: nonce,
//     });

//     res.redirect(authUrl);
// });

// // Logout route
// app.get('/logout', (req, res) => {
//     req.session.destroy();
//     const logoutUrl = `https://<user pool domain>/logout?client_id=3trgv39k9aknpcl0p5bupbr1do&logout_uri=<logout uri>`;
//     res.redirect(logoutUrl);
// });

//API-routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/images', imageRoutes);
app.use('/api/v1/comments', commentRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

//Connect to MongoDB and start server
(async () => {
  try {
    if (!process.env.MONGO_URL) throw new Error('Missing MONGO_URL');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup failed:', err?.message || err);
    process.exit(1);
  }
})();

//checing auth user
// const checkAuth = (req, res, next) => {
//     if (!req.session.userInfo) {
//         req.isAuthenticated = false;
//     } else {
//         req.isAuthenticated = true;
//     }
//     next();
// };


// import dotenv from 'dotenv';
// import express from 'express';
// import session from 'express-session';
// import cors from 'cors';
// import morgan from 'morgan';
// import mongoose from 'mongoose';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import {Issuer, generators} from 'openid-client';
// import jwt from 'jsonwebtoken';
// import {
//   CognitoIdentityProviderClient,
//   SignUpCommand,
//   ConfirmSignUpCommand,
//   InitiateAuthCommand
// } from "@aws-sdk/client-cognito-identity-provider";

// import authRoutes from './routes/auth.js';
// import imageRoutes from './routes/images.js';
// import commentRoutes from './routes/comments.js';
// import s3Routes from './routes/s3.js';   

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(morgan('dev'));
// app.use(cors());
// app.use(express.json({ limit: '2mb' }));

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// app.use('/', express.static(path.join(__dirname, 'public')));
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN; 
// const CLIENT_ID = process.env.COGNITO_CLIENT_ID; 
// const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET; 
// const REDIRECT_URI = process.env.COGNITO_REDIRECT_URI; 
// const LOGOUT_URI = process.env.COGNITO_LOGOUT_URI;
// const RESPONCE_TYPES = ['code'];

// let client;
// async function initializeClient() {
//   const issuer = await Issuer.discover('https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_m0pv1l4LB');
//   client = new issuer.Client({
//     client_id: CLIENT_ID,
//     client_secret: CLIENT_SECRET,
//     redirect_uris: [REDIRECT_URI],
//     response_types: RESPONCE_TYPES
//   });
// }
// initializeClient().catch(console.error);

// app.use(session({
//     secret: 'some secret',
//     resave: false,
//     saveUninitialized: false,
//     cookie: { secure: true } ,
// }));

// function setUserSession(req, idToken) {
//   try {
//     const payload = jwt.decode(idToken);

//     req.session.user = {
//       id_token: idToken,
//       sub: payload?.sub,
//       email: payload?.email,
//       role: payload?.role || (payload['cognito:groups']?.includes('Admin') ? 'admin' : 'user')
//     };
//   } catch (err) {
//     console.error('Failed to decode id_token:', err);
//     req.session.user = { id_token: idToken };
//   }
// }

// // authentication check from cognito setup
// function checkAuth(req, res, next) {
//   console.log("Session content:", req.session.user);
//   if (req.session.user && req.session.user.id_token) {
//     return next();
//   }
//   if (req.originalUrl.startsWith('/api/')) {
//     return res.status(401).json({ error: 'Not authenticated' });
//   }
//   res.redirect('/login');
// }

// // pages
// app.get('/', checkAuth, (_req, res) => {
//   console.log(_req.isAuthenticated)
//   res.render('/app', {
//     isAuthenticated: _req.isAuthenticated,
//     userInfo: _req.session.userInfo
//   })
// });

// app.get('/app', (_req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'app.html'));
// });

// app.get('/login',  (req, res) => {
//   if(!client) return res.status(500).send('Auth client not initialized');
//     const nonce = generators.nonce();
//     const state = generators.state();

//     req.session.nonce = nonce;
//     req.session.state = state;

//     const authUrl = client.authorizationUrl({
//         scope: 'email openid phone',
//         state: state,
//         nonce: nonce,
//     });

//     res.redirect(authUrl);
// });

// app.get('/logout', (req, res) => {
//     req.session.destroy();
//     const logoutUrl = `https://ap-southeast-2m0pv1l4lb.auth.ap-southeast-2.amazoncognito.com/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;
//     res.redirect(logoutUrl);
// });


// app.get('/callback', async (req, res) => {
//   const params = client.callbackParams(req);
  
//   try {
//     const tokenSet = await client.callback(REDIRECT_URI, params, {
//       state: req.session.state,
//       nonce: req.session.nonce,
//     });
    
//     const id_token = tokenSet.id_token; 

//     setUserSession(req, id_token);

//     console.log('req.session.user after callback:', req.session.user);
//     console.log('ID Token:', tokenSet.id_token);

//     res.redirect('/app');
//   } catch (err) {
//     console.error('Callback error:', err);
//     res.redirect('/');
//   }
// });


// app.get('/api/v1/me', (req, res) => {
//   if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
//   res.json(req.session.user);
// });

// app.use('/api/v1/auth', authRoutes);

// app.use('/api/v1/images', checkAuth, imageRoutes);
// app.use('/api/v1/comments', checkAuth, commentRoutes);
// app.use('/api/v1/s3', checkAuth, s3Routes);

// app.get('/health', (_req, res) => res.json({ ok: true }));

// //Connect to MongoDB and start server
// (async () => {
//   try {
//     if (!process.env.MONGO_URL) throw new Error('Missing MONGO_URL');
//     await mongoose.connect(process.env.MONGO_URL);
//     console.log('MongoDB connected');
//     app.listen(PORT, () => {
//       console.log(`Server running at http://localhost:${PORT}`);
//     });
//   } catch (err) {
//     console.error('Startup failed:', err?.message || err);
//     process.exit(1);
//   }
// })();
