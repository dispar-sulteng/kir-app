/* =========================================================================
   login.js
   ========================================================================= */

seedDataIfEmpty();

// Jika sudah login, langsung arahkan ke dashboard.
if (isLoggedIn()) {
  window.location.href = "dashboard.html";
}

const formLogin = document.getElementById("form-login");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errUsername = document.getElementById("err-username");
const errPassword = document.getElementById("err-password");
const errLogin = document.getElementById("err-login");

formLogin.addEventListener("submit", (e) => {
  e.preventDefault();

  errUsername.classList.remove("show");
  errPassword.classList.remove("show");
  errLogin.classList.remove("show");
  usernameInput.classList.remove("invalid");
  passwordInput.classList.remove("invalid");

  let valid = true;
  if (!usernameInput.value.trim()) {
    errUsername.classList.add("show");
    usernameInput.classList.add("invalid");
    valid = false;
  }
  if (!passwordInput.value) {
    errPassword.classList.add("show");
    passwordInput.classList.add("invalid");
    valid = false;
  }
  if (!valid) return;

  const success = attemptLogin(usernameInput.value, passwordInput.value);
  if (success) {
    window.location.href = "dashboard.html";
  } else {
    errLogin.classList.add("show");
    passwordInput.classList.add("invalid");
  }
});
