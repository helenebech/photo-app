// server.js
// This code sets up an Express server with MongoDB

import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import {Issuer, generators} from 'openid-client';
import {createRemoteJWKSet, jwtVerify} from 'jose'; 

import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import commentRoutes from './routes/comments.js';
import s3Routes from './routes/s3.js';   

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// static files
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cognito
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN; 
const CLIENT_ID = process.env.COGNITO_CLIENT_ID; 
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET; 
const REDIRECT_URI = process.env.COGNITO_REDIRECT_URI; 
const RESPONCE_TYPES = ['code'];

let client;
async function initializeClient() {
  const issuer = await Issuer.discover('https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_m0pv1l4LB');
  client = new issuer.Client({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uris: [REDIRECT_URI],
    response_types: RESPONCE_TYPES
  });
}
initializeClient().catch(console.error);

app.use(session({
    secret: 'some secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // set true if you’re behind HTTPS
      sameSite: 'lax' // 👈 allows sending cookies on same-site navigations + GET fetch
    }
}));

const jwks = createRemoteJWKSet(
  new URL('https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_m0pv1l4LB/.well-known/jwks.json')
);

// authentication check (Cognito)
function checkAuth(req, res, next) {
  console.log("Session content:", req.session.user);
  if (req.session.user && req.session.user.id_token) {
    return next();
  }
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // For regular page requests, redirect to login
  res.redirect('/login');
}

// pages
app.get('/', (_req, res) => {
  console.log(_req.isAuthenticated)
  if (_req.session.user && _req.session.user.id_token) {
    console.log("is auth so going to app.html");
    res.render('/app', {
      isAuthenticated: _req.isAuthenticated,
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
  // let authUrl;
  // const maxAttempts = 5;

  // for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  //   try {
  //     authUrl = client.authorizationUrl({
  //       scope: 'phone openid email',
  //       // state: state,
  //       // nonce: nonce,
  //       redirect_uri: REDIRECT_URI,
  //     });
  //    break;
  //   } catch (error) {
  //     console.warn(`Attempt ${attempt} failed: ${error.message}`);
  //     if (attempt === maxAttempts) {
  //       authUrl = 'https://ap-southeast-2m0pv1l4lb.auth.ap-southeast-2.amazoncognito.com/login/continue?client_id=7uqthmep27k07agt05acjdbqfs&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapp.html&response_type=code&scope=email+openid+phone';
  //     }
  //   }
  // } 
  // res.redirect(authUrl);
    const nonce = generators.nonce();
    const state = generators.state();

    req.session.nonce = nonce;
    req.session.state = state;

    const authUrl = client.authorizationUrl({
        scope: 'email openid phone',
        state: state,
        nonce: nonce,
    });

    res.redirect(authUrl);
});

// Logout route
app.get('/logout', (_req, res) => {
  const logoutUrl = 'https://ap-southeast-2m0pv1l4lb.auth.ap-southeast-2.amazoncognito.com/login?client_id=7uqthmep27k07agt05acjdbqfs&response_type=code&scope=email+openid+phone&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapp.html';
  res.redirect(logoutUrl);
});

app.get('/callback', async (req, res) => {
  const params = client.callbackParams(req);
  
  try {
    const tokenSet = await client.callback(REDIRECT_URI, params, {
      state: req.session.state,
      nonce: req.session.nonce,
    });

    req.session.user = {
      id_token: tokenSet.id_token,
      sub: tokenSet.claims.sub,
      email: tokenSet.claims.email,
      role: tokenSet.claims['cognito:groups']?.includes('admin') ? 'admin' : undefined
    };

    console.log('ID Token:', tokenSet.id_token);
    //req.session.user = {id_token: tokenSet.id_token};
    //console.log('Access Token:', tokenSet.access_token);

    //res.send('Login success! Check console for tokens.');
    res.redirect('/app');
  } catch (err) {
    console.error('Callback error:', err);
    res.redirect('/');
  }
});

app.get('/api/v1/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.session.user);
});

// API routes
app.use('/api/v1/auth', authRoutes);

// VIKTIG: beskytt med Cognito-auth før routers:
app.use('/api/v1/images', checkAuth, imageRoutes);
app.use('/api/v1/comments', checkAuth, commentRoutes);
app.use('/api/v1/s3', checkAuth, s3Routes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Connect to MongoDB and start server
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
