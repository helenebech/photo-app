// document.getElementById('loginBtn').onclick = async () => {
//   const username = document.getElementById('u').value;
//   const password = document.getElementById('p').value;
//   const r = await fetch('/api/v1/auth/login', {
//     method:'POST',
//     headers:{'Content-Type':'application/json'},
//     body: JSON.stringify({ username, password })
//   });
//   const j = await r.json();
//   if (!r.ok) {
//     document.getElementById('msg').textContent = j.error || 'Wrong username or password';
//     return;
//   }
//   localStorage.setItem('token', j.token);
//   location.replace('/app.html');
// };

// import dotenv from "dotenv";
// dotenv.config();
// const CLIENT_ID = process.env.COGNITO_CLIENT_ID; 
// const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET; 
// const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN; 
// const REDIRECT_URI = process.env.COGNITO_REDIRECT_URI; 

document.addEventListener("DOMContentLoaded", () => {
  const loginLink = document.getElementById("loginLink");

  // // Check if the user is logged in (token in localStorage)
  // const token = localStorage.getItem("token");
  // if (token) {
  //   // User is logged in → redirect to app.html
  //   window.location.href = "app.html";
  //   return;
  // }

  // If not logged in, set up login link
  loginLink.onclick = async(e) => {
    e.preventDefault();
    window.location.href = '/login'
  };
});


