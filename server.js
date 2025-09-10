//This code sets up an Express server with MongoDB

import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import {Issuer, generators} from 'openid-client';
//import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import {createRemoteJWKSet, jwtVerify} from 'jose'; 

import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import commentRoutes from './routes/comments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// app.use(
//   session({
//     secret: process.env.SESSION_SECRET || 'supersecret',
//     resave: false,
//     saveUninitialized: true,
//     cookie: { secure: false , httpOnly:true}, // true if HTTPS
//   })
// );

// app.use(session({
//   secret: 'someSecretKey',
//   resave: false,
//   saveUninitialized: true,
//   cookie: {
//     secure: false,      // must be false on localhost
//     httpOnly: true,
//     sameSite: 'lax'     // important for OAuth redirects
//   }
// }));

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

//static files
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Load environment variables for Cognito
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN; 
const CLIENT_ID = process.env.COGNITO_CLIENT_ID; 
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET; 
const REDIRECT_URI =process.env.COGNITO_REDIRECT_URI; //process.env.COGNITO_REDIRECT_AFTERLOGIN; 
const AFTERLOGIN = process.env.COGNITO_REDIRECT_AFTERLOGIN;
const RESPONCE_TYPES = ['code'];
const logout_uri = '/';

let client;
async function initializeClient() {
    const issuer = await Issuer.discover('https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_m0pv1l4LB');
    client = new issuer.Client({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uris: [REDIRECT_URI],
        response_types: RESPONCE_TYPES
    });
};

initializeClient().catch(console.error);

const jwks = createRemoteJWKSet(
  new URL('https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_m0pv1l4LB/.well-known/jwks.json')
);

//authentication check
async function checkAuth (req, res, next) {
    // if (!req.session.userInfo) {
    //     req.isAuthenticated = false;
    //     return res.redirect('/login.html');
    // } else {
    //     req.isAuthenticated = true;
    // }
    // next();
  console.log("Incoming request:", req.path);
  const authHeader = req.headers.authorization || '';
  console.log("Authorization header:", authHeader?.slice(0, 20) + '...');
  const token = authHeader.replace(/^Bearer\s+/, '');
  console.log("Received token:", token?.slice(0, 20) + '...');
  if (!token) return res.status(401).send('No token provided 1');
  try {
    // verify JWT with Cognito public keys
    console.log("Before jwtVerify");
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_m0pv1l4LB`,
      //audience: process.env.COGNITO_CLIENT_ID,
    }); 
    console.log("After jwtVerify");
    req.user = payload; // attach user info

    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).send('Unauthorized');
  }
};

//pages
app.get('/', (_req, res) => {
  console.log(_req.isAuthenticated)
  if (_req.isAuthenticated) {
    console.log("is auth so going to app.html");
    res.render('/app.html', {
      isAuthenticated: true,
      userInfo: _req.session.userInfo
    });
  } else {
    console.log("is not auth so in get(/) to login page")
    res.sendFile(path.join(__dirname, 'public', 'login.html')); 
  }
});

app.get('/app', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/login',  (req, res) => {
  if(!client) return res.status(500).send('Auth client not initialized');
  // const nonce = generators.nonce();
  // const state = generators.state();

  // req.session.nonce = nonce;
  // req.session.state = state;

  //make sure you store the jwt correctly
  let authUrl;
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      authUrl = client.authorizationUrl({
        scope: 'phone openid email',
        // state: state,
        // nonce: nonce,
        redirect_uri: REDIRECT_URI,
      });
     break;
    } catch (error) {
      console.warn(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt === maxAttempts) {
        authUrl = 'https://ap-southeast-2m0pv1l4lb.auth.ap-southeast-2.amazoncognito.com/login/continue?client_id=7uqthmep27k07agt05acjdbqfs&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapp.html&response_type=code&scope=email+openid+phone';
      }
    }
  } 
  res.redirect(authUrl);
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    console.log("trying to log out");
    const logoutUrl = 'https://ap-southeast-2m0pv1l4lb.auth.ap-southeast-2.amazoncognito.com/login?client_id=7uqthmep27k07agt05acjdbqfs&response_type=code&scope=email+openid+phone&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapp.html';
    res.redirect(logoutUrl);
});

// app.get('/callback', async (req, res) => {
//   //const params = client.callbackParams(req);
//   const { code, state } = req.query;
//   if(!req.session.state || state != req.session.state){
//     return res.status(403).send('Invalid state');
//   }
  
//   try {
//     const tokenSet = await client.callback(REDIRECT_URI, {code, state}, {
//       state: req.session.state,
//       nonce: req.session.nonce,
//     });

//     const userInfo = await client.userinfo(tokenSet.access_token);

//     req.session.userInfo = userInfo; 
//     req.session.tokenSet = tokenSet;

//     console.log('ID Token:', tokenSet.id_token);
//     console.log('Access Token:', tokenSet.access_token);

//     res.send('Login success! Check console for tokens.');
//     return res.redirect('/app');
//   } catch (err) {
//     console.error('Callback error:', err);
//     return res.redirect('/');
//   }
// });

app.get('/callback', async (req, res) => {
  console.log("ties to callback");
    try {
        const params = client.callbackParams(req);
        const tokenSet = await client.callback(
            REDIRECT_URI,
            params
            // {
            //     nonce: req.session?.nonce,
            //     state: req.session?.state
            // }
        );

        res.send(`
          <script>
          localStorage.setItem('access_token', '${tokenSet.access_token}');
          window.location.href='/app';
          </script>
        `);

    //     const userInfo = await client.userinfo(tokenSet.access_token);
    //     req.session.userInfo = userInfo;
    //     //localStorage.setItem('token', tokenSet.access_token)
    //     //store jwt correctly

    //     //console.log('Logged in user:', userInfo);
    //     console.log('Session after login:', req.session);
    //     // ✅ redirect to app.html
    //     return res.send(`
    //   <script>
    //     localStorage.setItem('token', '${tokenSet.access_token}');
    //     window.location.href = '/app';
    //   </script>
    // `);
        //return res.redirect('/app');
    } catch (err) {
        console.error('Callback error:', err);
        res.redirect('/');
    }
});

// Helper function to get the path from the URL. Example: "http://localhost/hello" returns "/hello"
// function getPathFromURL(urlString) {
//     try {
//         const url = new URL(urlString);
//         return url.pathname;
//     } catch (error) {
//         console.error('Invalid URL:', error);
//         return null;
//     }
// }

// app.get(getPathFromURL('https://d84l1y8p4kdic.cloudfront.net'), async (req, res) => {
//     try {
//         const params = client.callbackParams(req);
//         const tokenSet = await client.callback(
//             'https://d84l1y8p4kdic.cloudfront.net',
//             params,
//             {
//                 nonce: req.session.nonce,
//                 state: req.session.state
//             }
//         );

//         const userInfo = await client.userinfo(tokenSet.access_token);
//         req.session.userInfo = userInfo;

//         console.log(userInfo)
//         res.redirect('/app');
//     } catch (err) {
//         console.error('Callback error:', err);
//         res.redirect('/');
//     }
// });


//API-routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/images', checkAuth, imageRoutes);
app.use('/api/v1/comments',checkAuth, commentRoutes);

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
