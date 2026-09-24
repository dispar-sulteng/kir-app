/* =========================================================================
   dashboard.js
   ========================================================================= */

requireLogin();
renderShell("dashboard", "Dashboard");

const ICON_WRAP = {
  total: { bg: "#e7edf3", color: "#1c3a5a", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z"/><path d="M3 7.5v9L12 21l9-4.5v-9"/></svg>' },
  ruangan: { bg: "#e7edf3", color: "#1c3a5a", svg: ICONS.door },
  baik: { bg: "#e6f4ea", color: "#1e7a46", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>' },
  kurang: { bg: "#fdf1de", color: "#a86412", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><circle cx="12" cy="12" r="9"/><path d="M12 16h.01"/></svg>' },
  rusak: { bg: "#fbe9e7", color: "#b3261e", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 16h.01"/><path d="m21.7 18-8.6-15a1.3 1.3 0 0 0-2.2 0l-8.6 15a1.3 1.3 0 0 0 1.1 2h17.2a1.3 1.3 0 0 0 1.1-2Z"/></svg>' },
};

function statCardHtml(key, value, label) {
  const icon = ICON_WRAP[key];
  return `
    <div class="card stat-card">
      <span class="stat-icon" style="background:${icon.bg};color:${icon.color};">${icon.svg}</span>
      <span class="stat-value">${value}</span>
      <span class="stat-label">${label}</span>
    </div>`;
}

async function render() {
  document.getElementById("stat-grid").innerHTML = `<p style="color:var(--text-muted);">Memuat data...</p>`;

  let inventaris, ruangan;
  try {
    [inventaris, ruangan] = await Promise.all([getInventarisList(), getRuanganList()]);
  } catch (err) {
    document.getElementById("stat-grid").innerHTML = `<p style="color:var(--bad-text);">Gagal memuat data: ${escapeHtml(err.message)}</p>`;
    return;
  }

  const totalBarang = inventaris.reduce((sum, b) => sum + toAngka(b.jumlah), 0);
  const totalRuangan = ruangan.length;
  const baik = inventaris.filter((b) => b.kondisi === "Baik").reduce((s, b) => s + toAngka(b.jumlah), 0);
  const kurangBaik = inventaris.filter((b) => b.kondisi === "Kurang Baik").reduce((s, b) => s + toAngka(b.jumlah), 0);
  const rusakBerat = inventaris.filter((b) => b.kondisi === "Rusak Berat").reduce((s, b) => s + toAngka(b.jumlah), 0);

  document.getElementById("stat-grid").innerHTML =
    statCardHtml("total", totalBarang, "Total Barang (unit)") +
    statCardHtml("ruangan", totalRuangan, "Total Ruangan") +
    statCardHtml("baik", baik, "Kondisi Baik") +
    statCardHtml("kurang", kurangBaik, "Kondisi Kurang Baik") +
    statCardHtml("rusak", rusakBerat, "Kondisi Rusak Berat");

  const tbody = document.getElementById("ringkasan-ruangan-body");
  if (ruangan.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:24px;">Belum ada data ruangan.</td></tr>`;
    return;
  }

  tbody.innerHTML = ruangan
    .map((r) => {
      const barangDiRuangan = inventaris.filter((b) => b.ruanganId === r.id);
      const totalUnit = barangDiRuangan.reduce((s, b) => s + toAngka(b.jumlah), 0);
      return `
        <tr>
          <td>${escapeHtml(r.nama)}</td>
          <td>${barangDiRuangan.length}</td>
          <td>${totalUnit}</td>
        </tr>`;
    })
    .join("");
}

render();
