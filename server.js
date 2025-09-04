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

import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import commentRoutes from './routes/comments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // true if HTTPS
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

//static files
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Load environment variables for Cognito
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN; // e.g., "myapp.auth.ap-southeast-2.amazoncognito.com"
const CLIENT_ID = process.env.COGNITO_CLIENT_ID; // "3trgv39k9aknpcl0p5bupbr1do"
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET; // if used
const REDIRECT_URI = process.env.COGNITO_REDIRECT_URI; // e.g., "http://localhost:3000/callback"

let client;

(async () => {
  try {
    const issuer = await Issuer.discover(`https://${COGNITO_DOMAIN}`);
    client = new issuer.Client({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uris: [REDIRECT_URI],
      response_types: ['code'],
    });
    console.log('Cognito client initialized');
  } catch (err) {
    console.error('Failed to initialize Cognito client:', err);
  }
})();

//authentication check
function checkAuth (req, res, next) {
    if (!req.session.userInfo) {
        req.isAuthenticated = false;
    } else {
        req.isAuthenticated = true;
    }
    next();
};

//pages
app.get('/', checkAuth, (_req, res) => {
  if (_req.isAuthenticated) {
    res.render('home', {
      isAuthenticated: true,
      userInfo: _req.session.userInfo
    });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

app.get('/app', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/login', (req, res) => {
  if(!client) return res.status(500).send('Auth client not initialized');
  const nonce = generators.nonce();
  const state = generators.state();

  req.session.nonce = nonce;
  req.session.state = state;

  const authUrl = client.authorizationUrl({
    scope: 'phone openid email',
    state: state,
    nonce: nonce,
  });

    res.redirect(authUrl);
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    const logoutUrl = `https://${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${REDIRECT_URI}`;
    res.redirect(logoutUrl);
});

app.get('/callback', async (req, res) => {
  const params = client.callbackParams(req);

  try {
    const tokenSet = await client.callback(REDIRECT_URI, params, {
      state: req.session.state,
      nonce: req.session.nonce,
    });

    req.session.userInfo = tokenSet.claims(); // store user info in session
    res.redirect('/');
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).send('Authentication failed');
  }
});


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
