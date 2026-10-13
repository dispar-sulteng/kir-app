/* =========================================================================
   auth.js
   Login sungguhan memakai Supabase Auth (email + kata sandi).
   Peran pengguna disimpan di tabel `profiles`:
     admin : boleh lihat, cetak, tambah, edit, DAN hapus data
     staf  : boleh lihat, cetak, tambah, dan edit data (TIDAK boleh hapus)

   Aturan ini dipaksakan di database (Row Level Security), bukan hanya
   disembunyikan di tampilan — lihat supabase/migration-3-auth-roles.sql.
   ========================================================================= */

let profilSaatIni = null;
let authPromise = null;

async function muatSesi() {
  const { data, error } = await supabaseClient.auth.getSession();
  const session = data && data.session;
  if (error || !session) return null;

  const { data: profil } = await supabaseClient
    .from("profiles")
    .select("id, nama, role, aktif, email")
    .eq("id", session.user.id)
    .maybeSingle();

  profilSaatIni = {
    id: session.user.id,
    email: session.user.email,
    nama: (profil && profil.nama) || session.user.email,
    role: profil && profil.role ? profil.role : null,
    aktif: !!(profil && profil.aktif),
  };
  return profilSaatIni;
}

/* Dipanggil di awal setiap halaman terproteksi. Mengembalikan Promise yang
   selesai setelah sesi terverifikasi. Kalau belum login, pengguna dialihkan
   ke halaman login dan Promise tidak pernah selesai (kode halaman berhenti). */
function requireLogin() {
  if (!authPromise) {
    authPromise = muatSesi().then(async (profil) => {
      if (!profil) {
        window.location.href = "index.html";
        return new Promise(() => {});
      }
      if (!profil.aktif) {
        // Akun belum disetujui admin (atau dinonaktifkan)
        await supabaseClient.auth.signOut();
        window.location.href = "index.html?status=menunggu";
        return new Promise(() => {});
      }
      return profil;
    });
  }
  return authPromise;
}

function isAdmin() {
  return !!profilSaatIni && profilSaatIni.role === "admin";
}

function currentUser() {
  return profilSaatIni ? profilSaatIni.nama : "Pengguna";
}

function currentRoleLabel() {
  if (!profilSaatIni || !profilSaatIni.role) return "Tanpa peran";
  return profilSaatIni.role === "admin" ? "Admin" : "Staf";
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}
