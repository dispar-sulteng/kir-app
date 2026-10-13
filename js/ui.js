/* =========================================================================
   ui.js
   Komponen antarmuka yang dipakai bersama di semua halaman: sidebar,
   topbar, notifikasi toast, dan beberapa fungsi bantu tampilan.
   ========================================================================= */

const NAV_ITEMS = [
  { key: "dashboard", href: "dashboard.html", label: "Dashboard", icon: "grid" },
  { key: "inventaris", href: "inventaris.html", label: "Data Inventaris", icon: "box" },
  { key: "ruangan", href: "ruangan.html", label: "Data Ruangan", icon: "door" },
  { key: "kir", href: "kir.html", label: "Kartu Inventaris Ruangan", icon: "card" },
  { key: "pengguna", href: "pengguna.html", label: "Kelola Pengguna", icon: "users", adminOnly: true },
];

const ICONS = {
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.2c2.6.2 4.5 2 4.5 5.3"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z"/><path d="M3 7.5v9L12 21l9-4.5v-9"/><path d="M12 12v9"/></svg>',
  door: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="3" width="14" height="18" rx="1"/><circle cx="14.5" cy="12" r="1"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 9.5h18"/><path d="M7 14h6"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
};

function renderShell(activeKey, pageTitle) {
  const sidebarEl = document.getElementById("sidebar");
  const topbarEl = document.getElementById("topbar");

  if (sidebarEl) {
    sidebarEl.innerHTML = `
      <div class="brand">
        <span class="brand-mark">KIR</span>
        <span class="brand-text">Sistem Inventaris<br/>Dispar Sulteng</span>
      </div>
      <nav class="nav">
        ${NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin()).map(
          (item) => `
          <a class="nav-link ${item.key === activeKey ? "active" : ""}" href="${item.href}">
            <span class="nav-icon">${ICONS[item.icon]}</span>
            <span>${item.label}</span>
          </a>`
        ).join("")}
      </nav>
      <button class="nav-logout" id="btn-logout" type="button">
        <span class="nav-icon">${ICONS.logout}</span>
        <span>Keluar</span>
      </button>
    `;
    document.getElementById("btn-logout").addEventListener("click", logout);
    if (isAdmin()) tampilkanBadgePengguna();
  }

  if (topbarEl) {
    topbarEl.innerHTML = `
      <h1>${pageTitle}</h1>
      <div class="topbar-user">
        <span class="user-avatar">${currentUser().charAt(0).toUpperCase()}</span>
        <span class="user-name">${escapeHtml(currentUser())}</span>
        <span class="user-role">${escapeHtml(currentRoleLabel())}</span>
      </div>
    `;
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function kondisiBadgeClass(kondisi) {
  if (kondisi === "Baik") return "badge badge-good";
  if (kondisi === "Kurang Baik") return "badge badge-warn";
  return "badge badge-bad";
}

let toastTimer = null;
function showToast(message, type = "success") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.className = `toast toast-${type} show`;
  el.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function formatTanggalIndo(dateStr) {
  if (!dateStr) return "-";
  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

/* Lencana angka di menu "Kelola Pengguna": jumlah akun yang menunggu persetujuan */
async function tampilkanBadgePengguna() {
  const { count, error } = await supabaseClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("aktif", false);
  if (error || !count) return;
  const link = document.querySelector('.nav-link[href="pengguna.html"]');
  if (link) link.insertAdjacentHTML("beforeend", `<span class="nav-badge">${count}</span>`);
}
