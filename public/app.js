(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);
  //console.log("LocalStorage keys:", Object.keys(localStorage));
  //console.log("access_token in localStorage:", localStorage.getItem('access_token'));


  const qs = (id) => document.getElementById(id);
  const state = { token: null, isAdmin: false };
  const redirectToLogin = () => { 
    //localStorage.removeItem('access_token'); 
    location.replace('/login'); };

  // const authHeaders = (extra = {}) =>
  //   state.token ? { Authorization: 'Bearer ' + state.token, ...extra } : { ...extra };
  const authHeaders = (extra = {}) => ({ ...extra });

  async function fetchJSON(url, opts = {}) {
    const r = await fetch(url, { 
    ...opts, 
    credentials: 'include',   // 👈 important: send session cookie
    headers: { ...(opts.headers || {}) }
  });
  //const me = await fetch('/api/v1/me', { credentials: 'include' }).then(r => r.json());
    if (r.status === 401) { 
      console.log("Error in the fetchJSON in app.js");
      redirectToLogin(); 
      return Promise.reject(new Error('Unauthorized')); 
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    return data;
  }
  
  //initialize project and user-status (admin)
  // function init() {
  //   //state.token = localStorage.getItem('access_token');
  //   //console.log("Token from localStorage:", localStorage.getItem('access_token'));
  //   console.log("Auth headers would be:", authHeaders());   
  //   console.log("State in app.js is:", state);
  //   if (!state.token) { redirectToLogin(); return; }

  //   try {
  //     const payload = JSON.parse(atob(state.token.split('.')[1] || ''));
  //     state.isAdmin = payload?.role === 'admin';
  //   }
  //   catch {
  //     state.isAdmin = false;
  //   }

  //   qs('logoutBtn')?.addEventListener('click', () => { 
  //     //localStorage.removeItem('access_token');
  //     window.location.href = '/logout'});
  //   qs('uploadBtn')?.addEventListener('click', () => uploadImg(qs('file')));
  //   qs('refreshBtn')?.addEventListener('click', listImgs);

  //   listImgs();
  // }

// function init() {
//   // no token check anymore, session handled by server
//   qs('logoutBtn')?.addEventListener('click', () => { 
//     window.location.href = '/logout';
//   });
//   qs('uploadBtn')?.addEventListener('click', () => uploadImg(qs('file')));
//   qs('refreshBtn')?.addEventListener('click', listImgs);

//   listImgs();
// }

  function init() {
    //state.token = localStorage.getItem('token');
    //if (!state.token) { redirectToLogin(); return; }

    // try {
    //   const payload = JSON.parse(atob(state.token.split('.')[1] || ''));
    //   state.isAdmin = payload?.role === 'admin';
    // } 
    // catch { 
    //   state.isAdmin = false; 
    // }

    qs('logoutBtn')?.addEventListener('click', () => redirectToLogin());
    qs('uploadBtn')?.addEventListener('click', () => uploadImg(qs('file')));
    qs('refreshBtn')?.addEventListener('click', listImgs);

    listImgs();
  }

  // --- Hjelpefunksjoner for presigned GET (visning) ---

  // hente signed GET-URL fra backend for privat S3
  async function getViewUrlFromKey(key) {
    if (!key) return null;
    try {
      const { url } = await fetchJSON(`/api/v1/s3/view-url?key=${encodeURIComponent(key)}`);
      return url || null;
    } catch {
      return null;
    }
  }

  // sjekk om en streng allerede er en http/https-URL
  function isHttpUrl(str) {
    return typeof str === 'string' && /^https?:\/\//i.test(str);
  }

  // finn beste kandidat (edit -> medium -> thumb -> original -> key),
  // gjør S3-key -> presigned URL, og legg på cache-buster for ikke-presignede
  async function resolveSrc(u) {
    const candidate =
      u?.edit || u?.medium || u?.thumb || u?.original || u?.art || u?.key || null;

    if (!candidate) return null;

    const rawUrl = isHttpUrl(candidate) ? candidate : await getViewUrlFromKey(candidate);
    if (!rawUrl) return null;

    // Ikke endre presignede S3-URLer (de inneholder X-Amz-*)
    const isPresignedS3 = /[?&]X-Amz-Algorithm=AWS4-HMAC-SHA256/i.test(rawUrl);
    if (isPresignedS3) return rawUrl;

    const urlObj = new URL(rawUrl, window.location.origin);
    urlObj.searchParams.set('v', Date.now().toString());
    return urlObj.toString();
  }

  // --- Opplasting med presigned URLs ---
  //upload pictures to the gallery (nå med presigned URLs)
  async function uploadImg(fileInput) {
    const btn = qs('uploadBtn');
    try {
      const f = fileInput?.files?.[0];
      if (!f) { alert('Velg en fil'); return; }

      // disable knapp for å hindre dobbeltklikk
      if (btn) { btn.disabled = true; btn.textContent = 'Laster opp…'; }

      // 1. Be backend om en presigned upload-URL
      const contentType = f.type || 'application/octet-stream'; // må matche i PUT
      const { uploadUrl, key } = await fetchJSON('/api/v1/s3/upload-url', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ filename: f.name, contentType }), 
        credentials: 'include'  // important to include session cookie
      });

      // 2. Last opp filen direkte til S3 med PUT (kun Content-Type, ingen auth-headere!)
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: f
      });

      if (!putRes.ok) {
        const text = await putRes.text().catch(() => '');
        console.error('S3 PUT failed', putRes.status, text);
        alert(`Feil ved direkte opplasting til S3 (status ${putRes.status}).`);
        return;
      }

      // 3. Registrer bildet i backend-databasen
      const img = await fetchJSON('/api/v1/images/from-key', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ key, mimeType: contentType, size: f.size, title: f.name }), 
        credentials: 'include'  // important to include session cookie
      });

      // 4. Start prosessering (f.eks. grayscale)
      await fetch(`/api/v1/images/${img._id}/process`, { method: 'POST', headers: authHeaders() }).catch(() => {});

      // 5. Rydd opp og oppdater UI
      fileInput.value = '';
      setTimeout(listImgs, 700);
    } catch (e) {
      console.error('uploadImg', e);
      alert('Nettverksfeil ved opplasting.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Upload picture'; }
    }
  }

  //fetches pictures for the gallery
  async function listImgs() {
    const grid = qs('gallery');
    if (!grid) return;
    grid.textContent = 'Laster …';

    try {
      const url = state.isAdmin
        ? '/api/v1/images?all=1&page=1&limit=50&sort=-createdAt'
        : '/api/v1/images?page=1&limit=50&sort=-createdAt';

      const { items = [], isAdmin: srvAdmin } = await fetchJSON(url);
      if (typeof srvAdmin !== 'undefined') state.isAdmin = !!srvAdmin;

      grid.innerHTML = '';
      items.forEach((it) => grid.appendChild(makeTile(it)));

      if (!grid.children.length) grid.innerHTML = '<p style="opacity:.7">No pictures (yet)☯︎</p>';
    } catch (e) {
      console.log('listImgs', e);
      grid.innerHTML = '<p style="opacity:.7">Could not fetch pictures✌︎︎</p>';
    }
  }

  //function for each seperate square in the gallery
  function makeTile(it) {
    const u = it.urls || {};
    const wrap = el('div', 'gallery-item');

    const media = el('div', 'gallery-media');
    const img = new Image();
    img.alt = it.title || it.filename || it._id || 'image';

    // last inn bilde-URL (presigned hvis nødvendig)
    (async () => {
      const src = await resolveSrc(u);
      if (!src) {
        media.textContent = 'Ingen bilde-URL tilgjengelig';
        return;
      }
      img.src = src; // bruk presigned URL nøyaktig som den er
    })();

    // fallback hvis lastingen feiler
    img.onerror = async () => {
      const href = await resolveSrc(u);
      if (href) {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = it.filename || 'Open image';
        a.target = '_blank';
        media.replaceChildren(a);
      } else {
        media.textContent = 'Kunne ikke laste bildet';
      }
    };
    media.appendChild(img);

    //edit pictures
    const actions = el('div', 'actions');
    actions.appendChild(actionBtn('Grayscale', async () => {
      await editImage(it._id, { effect: 'grayscale' });
      setTimeout(listImgs, 700);
    }));
    if (state.isAdmin) {
      actions.appendChild(actionBtn('Delete', async () => {
        if (!confirm('Do you want to delete this picture?')) return;
        await fetch(`/api/v1/images/${it._id}`, { method: 'DELETE', headers: authHeaders() });
        listImgs();
      }));
    }

    //comments
    const comments = el('div', 'comments');
    const list = el('div'); list.textContent = 'Laster kommentarer...';
    const input = document.createElement('input'); input.placeholder = 'Write a comment…';
    const send = document.createElement('button'); send.textContent = 'Send';
    send.onclick = async () => {
      const text = (input.value || '').trim(); if (!text) return;
      await fetch('/api/v1/comments', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ imageId: it._id, text })
      });
      input.value = '';
      renderComments(it._id, list);
    };
    const form = el('div', 'comment-form'); form.append(input, send);
    comments.append(list, form);

    wrap.append(media, actions, comments);
    renderComments(it._id, list);
    return wrap;
  }

  //grayscaling pictures
  async function editImage(id, edit) {
    try {
      await fetch(`/api/v1/images/${id}/process`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(edit || {})
      });
    } catch (e) { console.error('editImage', e); }
  }

  //fetch comments
  async function renderComments(imageId, mount) {
    try {
      const { items = [] } = await fetchJSON(`/api/v1/comments?imageId=${encodeURIComponent(imageId)}`);
      mount.innerHTML = '';
      if (!items.length) { mount.textContent = 'No comments yet🤍'; return; }
      items.slice(0, 5).forEach(c => {
        const p = el('div', 'comment');
        p.textContent = c.text;
        mount.appendChild(p);
      });
    } catch {
      mount.textContent = 'Comments could not load..';
    }
  }

  function actionBtn(label, onClick) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = onClick;
    return b;
  }

  function el(tag, className) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    return n;
  }
})();
