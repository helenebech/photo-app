(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  const qs = (id) => document.getElementById(id);
  const state = { token: null, isAdmin: false };

  const redirectToLogin = () => { localStorage.removeItem('token'); location.replace('/login.html'); };

  const authHeaders = (extra = {}) =>
    state.token ? { Authorization: 'Bearer ' + state.token, ...extra } : { ...extra };

  async function fetchJSON(url, opts = {}) {
    const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), ...authHeaders() } });
    if (r.status === 401) {
      redirectToLogin(); return Promise.reject(new Error('Unauthorized'));
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    return data;
  }

  //initialize project and user-status (admin)
  function init() {
    state.token = localStorage.getItem('token');
    if (!state.token) { redirectToLogin(); return; }

    try {
      const payload = JSON.parse(atob(state.token.split('.')[1] || ''));
      state.isAdmin = payload?.role === 'admin';
    }
    catch {
      state.isAdmin = false;
    }

    qs('logoutBtn')?.addEventListener('click', () => redirectToLogin());
    qs('uploadBtn')?.addEventListener('click', () => uploadImg(qs('file')));
    qs('refreshBtn')?.addEventListener('click', listImgs);

    listImgs();
  }

  //upload pictures to the gallary
  async function uploadImg(fileInput) {
    try {
      const f = fileInput?.files?.[0];
      if (!f) { alert('Velg en fil'); return; }

      const fd = new FormData();
      fd.append('image', f);

      const up = await fetch('/api/v1/images', { method: 'POST', headers: authHeaders(), body: fd });
      const j = await up.json().catch(() => ({}));
      if (!up.ok) { alert(j?.error || 'Feil ved opplasting'); return; }

      await fetch(`/api/v1/images/${j._id}/process`, { method: 'POST', headers: authHeaders() }).catch(() => {});

      setTimeout(listImgs, 700);
    } catch (e) {
      console.error('uploadImg', e);
      alert('Nettverksfeil ved opplasting.');
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
      console.error('listImgs', e);
      grid.innerHTML = '<p style="opacity:.7">Could not fetch pictures✌︎︎</p>';
    }
  }

  // hjelpefunksjon for å hente signed GET-URL fra backend for privat S3
  async function getViewUrlFromKey(key) {
    if (!key) return null;
    try {
      const { url } = await fetchJSON(`/api/v1/s3/view-url?key=${encodeURIComponent(key)}`);
      return url || null;
    } catch {
      return null;
    }
  }

  // endret (assistant): sjekk om en streng allerede er en http/https-URL
  function isHttpUrl(str) {
    return typeof str === 'string' && /^https?:\/\//i.test(str);
  }

  // endret (assistant): finn beste kandidat (edit -> thumb -> medium -> original -> key), gjør S3-key -> presigned URL, og legg på cache-buster
  async function resolveSrc(u) {
  // Velg beste kandidat
  const candidate =
    u?.edit  || u?.medium || u?.thumb || u?.original || u?.art || u?.key || null;

  if (!candidate) return null;

  // Hent URL (presigned hvis det er en S3-key)
  const rawUrl = isHttpUrl(candidate) ? candidate : await getViewUrlFromKey(candidate);
  if (!rawUrl) return null;

  // VIKTIG: Ikke endre presignede S3-URLer (de inneholder X-Amz-*)
  const isPresignedS3 = /[?&]X-Amz-Algorithm=AWS4-HMAC-SHA256/i.test(rawUrl);
  if (isPresignedS3) return rawUrl;

  // For ikke-presignede, kan du cache-buste trygt:
  const urlObj = new URL(rawUrl, window.location.origin);
  urlObj.searchParams.set('v', Date.now().toString());
  return urlObj.toString();
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
