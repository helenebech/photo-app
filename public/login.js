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

  // Check if the user is logged in (token in localStorage)
  const token = localStorage.getItem("token");
  if (token) {
    // User is logged in → redirect to app.html
    window.location.href = "app.html";
    return;
  }

  // If not logged in, set up login link
  loginLink.onclick = async(e) => {
    e.preventDefault();
    //window.location.href = '/login'
    window.location.href = 'http://localhost:3000/login';
  //   try {
  //  // Call your server endpoint
  //     const response = await fetch('/api/v1/auth/login', { credentials: 'include' }); // This hits app.get('/login') on the server
  //     //const data = await response.json();

  //   // The server can respond with the Cognito login URL
  //   //   if (data && data.loginUrl) {
  //   //     window.location.href = data.loginUrl; // redirect user
  //   //   }
  //   } catch (err) {
  //      console.error('Error redirecting to login:', err);
  //    }
    // Redirect to Cognito Hosted UI login page
    //const scope = "email openid phone";

    //const loginUrl ='https://ap-southeast-2m0pv1l4lb.auth.ap-southeast-2.amazoncognito.com/login?client_id=7uqthmep27k07agt05acjdbqfs&response_type=code&scope=email+openid+phone&redirect_uri=https%3A%2F%2Fd84l1y8p4kdic.cloudfront.net'
    // `https://${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    //window.location.href = loginUrl;
  };
});


