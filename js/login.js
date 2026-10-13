/* =========================================================================
   login.js — masuk dan daftar mandiri
   Akun baru berstatus "menunggu" sampai disetujui admin (Kelola Pengguna).
   ========================================================================= */

// Jika sudah punya sesi login yang valid, langsung ke dashboard.
(async function cekSesiAwal() {
  const { data } = await supabaseClient.auth.getSession();
  if (data && data.session) {
    window.location.href = "dashboard.html";
  }
})();

const formLogin = document.getElementById("form-login");
const formDaftar = document.getElementById("form-daftar");
const infoSukses = document.getElementById("info-sukses");
const errLogin = document.getElementById("err-login");
const errDaftar = document.getElementById("err-daftar");
const btnLogin = document.getElementById("btn-login");
const btnDaftar = document.getElementById("btn-daftar");

const PESAN_MENUNGGU = "Akun kamu belum disetujui admin. Silakan tunggu persetujuan, atau hubungi admin.";

/* ---------- pindah antara mode Masuk dan Daftar ---------- */
function tampilkanMode(mode) {
  const daftar = mode === "daftar";
  formLogin.style.display = daftar ? "none" : "block";
  formDaftar.style.display = daftar ? "block" : "none";
  document.getElementById("switch-ke-daftar").style.display = daftar ? "none" : "block";
  document.getElementById("switch-ke-masuk").style.display = daftar ? "block" : "none";
  if (daftar) infoSukses.style.display = "none";
}
document.getElementById("btn-ke-daftar").addEventListener("click", () => tampilkanMode("daftar"));
document.getElementById("btn-ke-masuk").addEventListener("click", () => tampilkanMode("masuk"));

// Dialihkan dari halaman lain karena akunnya belum disetujui
if (new URLSearchParams(window.location.search).get("status") === "menunggu") {
  errLogin.textContent = PESAN_MENUNGGU;
  errLogin.classList.add("show");
}

function bersihkanError(form) {
  form.querySelectorAll(".field-error").forEach((el) => el.classList.remove("show"));
  form.querySelectorAll("input").forEach((el) => el.classList.remove("invalid"));
}
function tandaiError(inputId, errId) {
  document.getElementById(inputId).classList.add("invalid");
  document.getElementById(errId).classList.add("show");
}

/* ---------- MASUK ---------- */
function pesanErrorLogin(error) {
  const msg = (error && error.message) || "";
  if (/invalid login credentials/i.test(msg)) return "Email atau kata sandi salah.";
  if (/email not confirmed/i.test(msg)) return "Email belum dikonfirmasi. Hubungi admin.";
  if (/failed to fetch|network/i.test(msg)) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet, atau hubungi admin.";
  }
  return msg || "Gagal masuk. Coba lagi.";
}

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  bersihkanError(formLogin);
  infoSukses.style.display = "none";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  let valid = true;
  if (!email) { tandaiError("email", "err-email"); valid = false; }
  if (!password) { tandaiError("password", "err-password"); valid = false; }
  if (!valid) return;

  btnLogin.disabled = true;
  btnLogin.textContent = "Memproses...";

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Akun yang belum disetujui admin tidak boleh masuk
    const { data: profil } = await supabaseClient
      .from("profiles")
      .select("aktif")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profil || !profil.aktif) {
      await supabaseClient.auth.signOut();
      throw new Error(PESAN_MENUNGGU);
    }

    window.location.href = "dashboard.html";
  } catch (err) {
    errLogin.textContent = pesanErrorLogin(err);
    errLogin.classList.add("show");
    btnLogin.disabled = false;
    btnLogin.textContent = "Masuk";
  }
});

/* ---------- DAFTAR ---------- */
function pesanErrorDaftar(error) {
  const msg = (error && error.message) || "";
  if (/already registered|already been registered/i.test(msg)) return "Email ini sudah terdaftar. Silakan masuk.";
  if (/signups? (not allowed|disabled|is disabled)|sign.?ups? (are )?disabled/i.test(msg)) {
    return "Pendaftaran sedang ditutup. Hubungi admin.";
  }
  if (/rate limit|too many/i.test(msg)) return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
  if (/password/i.test(msg)) return "Kata sandi belum memenuhi syarat. Gunakan minimal 8 karakter.";
  if (/failed to fetch|network/i.test(msg)) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet, atau hubungi admin.";
  }
  return msg || "Pendaftaran gagal. Coba lagi.";
}

formDaftar.addEventListener("submit", async (e) => {
  e.preventDefault();
  bersihkanError(formDaftar);
  errDaftar.classList.remove("show");

  const nama = document.getElementById("daftar-nama").value.trim();
  const email = document.getElementById("daftar-email").value.trim();
  const password = document.getElementById("daftar-password").value;
  const konfirmasi = document.getElementById("daftar-konfirmasi").value;

  let valid = true;
  if (!nama) { tandaiError("daftar-nama", "err-daftar-nama"); valid = false; }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) { tandaiError("daftar-email", "err-daftar-email"); valid = false; }
  if (password.length < 8) { tandaiError("daftar-password", "err-daftar-password"); valid = false; }
  if (password !== konfirmasi) { tandaiError("daftar-konfirmasi", "err-daftar-konfirmasi"); valid = false; }
  if (!valid) return;

  btnDaftar.disabled = true;
  btnDaftar.textContent = "Memproses...";

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { nama } },
    });
    if (error) throw error;

    // Kalau konfirmasi email dimatikan, Supabase langsung membuat sesi.
    // Akun belum disetujui, jadi keluarkan lagi.
    if (data && data.session) await supabaseClient.auth.signOut();

    formDaftar.reset();
    tampilkanMode("masuk");
    infoSukses.textContent = "Pendaftaran berhasil. Akun kamu menunggu persetujuan admin sebelum bisa dipakai masuk.";
    infoSukses.style.display = "block";
  } catch (err) {
    errDaftar.textContent = pesanErrorDaftar(err);
    errDaftar.classList.add("show");
  } finally {
    btnDaftar.disabled = false;
    btnDaftar.textContent = "Daftar";
  }
});
