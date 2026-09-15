/* =========================================================================
   auth.js
   Login sederhana untuk prototype. Kredensial demo:
     Username : admin
     Password : admin123
   ========================================================================= */

const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "admin123";

function isLoggedIn() {
  return localStorage.getItem(STORAGE_KEYS.SESSION) === "true";
}

function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = "index.html";
  }
}

function attemptLogin(username, password) {
  if (username.trim() === DEMO_USERNAME && password === DEMO_PASSWORD) {
    localStorage.setItem(STORAGE_KEYS.SESSION, "true");
    localStorage.setItem(STORAGE_KEYS.USER, username.trim());
    return true;
  }
  return false;
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  window.location.href = "index.html";
}

function currentUser() {
  return localStorage.getItem(STORAGE_KEYS.USER) || "Admin";
}
