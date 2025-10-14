document.getElementById('loginBtn').onclick = async () => {
  const username = document.getElementById('u').value;
  const password = document.getElementById('p').value;
  const r = await fetch('/api/v1/auth/login', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  });
  const j = await r.json();
  if (!r.ok) {
    document.getElementById('msg').textContent = j.error || 'Wrong username or password';
    return;
  }
  localStorage.setItem('token', j.token);
  location.replace('/app.html');
};