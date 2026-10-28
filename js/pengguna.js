/* =========================================================================
   pengguna.js — Kelola Pengguna (khusus admin)
   Menyetujui akun baru, menonaktifkan akun, dan mengubah peran.
   Aturan sebenarnya dipaksakan di database (Row Level Security);
   halaman ini hanya antarmukanya.
   ========================================================================= */

const tbody = document.getElementById("tabel-pengguna-body");
const infoMenunggu = document.getElementById("info-menunggu");
let daftarProfil = [];

function badgeStatus(aktif) {
  return aktif
    ? '<span class="badge badge-good">Aktif</span>'
    : '<span class="badge badge-warn">Menunggu persetujuan</span>';
}

async function renderPengguna() {
  tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>Memuat data...</p></div></td></tr>`;

  try {
    daftarProfil = await getProfilList();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="color:var(--bad-text);"><p>Gagal memuat data: ${escapeHtml(err.message)}</p></div></td></tr>`;
    return;
  }

  const menunggu = daftarProfil.filter((p) => !p.aktif).length;
  infoMenunggu.textContent =
    menunggu > 0 ? `${menunggu} akun menunggu persetujuan.` : "Tidak ada akun yang menunggu persetujuan.";
  infoMenunggu.className = "info-bar" + (menunggu > 0 ? " info-warn" : "");

  if (daftarProfil.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>Belum ada pengguna.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = daftarProfil
    .map((p) => {
      const saya = p.id === profilSaatIni.id;

      const kolomPeran = saya
        ? "Admin (akun Anda)"
        : `<select class="select-peran" data-action="peran" data-id="${p.id}">
             <option value="staf" ${p.role === "staf" ? "selected" : ""}>Staf</option>
             <option value="admin" ${p.role === "admin" ? "selected" : ""}>Admin</option>
           </select>`;

      let aksi = "-";
      if (!saya) {
        const tombolUtama = p.aktif
          ? `<button class="btn btn-secondary btn-sm" data-action="nonaktifkan" data-id="${p.id}">Nonaktifkan</button>`
          : `<button class="btn btn-primary btn-sm" data-action="setujui" data-id="${p.id}">Setujui</button>`;
        const tombolHapus = `<button class="btn btn-danger btn-sm" data-action="hapus" data-id="${p.id}">Hapus</button>`;
        aksi = tombolUtama + tombolHapus;
      }

      return `
        <tr>
          <td>${escapeHtml(p.nama)}</td>
          <td>${escapeHtml(p.email || "-")}</td>
          <td>${kolomPeran}</td>
          <td>${badgeStatus(p.aktif)}</td>
          <td><div class="col-actions">${aksi}</div></td>
        </tr>`;
    })
    .join("");
}

async function simpanPerubahan(id, perubahan, pesanSukses) {
  try {
    await updateProfil(id, perubahan);
    showToast(pesanSukses);
  } catch (err) {
    showToast(err.message, "danger");
  }
  await renderPengguna();
  tampilkanBadgeSetelahUbah();
}

// Perbarui angka lencana di sidebar setelah ada persetujuan/penonaktifan
function tampilkanBadgeSetelahUbah() {
  const lama = document.querySelector(".nav-badge");
  if (lama) lama.remove();
  tampilkanBadgePengguna();
}

tbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const p = daftarProfil.find((x) => x.id === id);
  if (!p) return;

  if (btn.dataset.action === "setujui") {
    await simpanPerubahan(id, { aktif: true }, `Akun ${p.nama} disetujui.`);
  }
  if (btn.dataset.action === "hapus") {
    const ok = window.confirm(
      `Hapus akun "${p.nama}" (${p.email || "tanpa email"}) secara PERMANEN?\n\n` +
      `Akun dan akses masuknya dihapus dan tidak bisa dikembalikan. ` +
      `Data inventaris yang pernah ia input tidak ikut terhapus. ` +
      `Kalau ingin memakai sistem lagi, ia harus mendaftar ulang dan disetujui kembali.\n\n` +
      `(Pilih "Nonaktifkan" kalau hanya ingin menutup aksesnya sementara.)`
    );
    if (ok) {
      try {
        await hapusPengguna(id);
        showToast(`Akun ${p.nama} dihapus.`);
      } catch (err) {
        showToast(err.message, "danger");
      }
      await renderPengguna();
      tampilkanBadgeSetelahUbah();
    }
  }
  if (btn.dataset.action === "nonaktifkan") {
    const ok = window.confirm(`Nonaktifkan akun "${p.nama}"?\n\nAkun ini tidak akan bisa masuk lagi sampai disetujui kembali.`);
    if (ok) await simpanPerubahan(id, { aktif: false }, `Akun ${p.nama} dinonaktifkan.`);
  }
});

tbody.addEventListener("change", async (e) => {
  const sel = e.target.closest("select[data-action='peran']");
  if (!sel) return;
  const p = daftarProfil.find((x) => x.id === sel.dataset.id);
  if (!p) return;

  const peranBaru = sel.value;
  const label = peranBaru === "admin" ? "Admin (boleh menghapus data dan mengelola pengguna)" : "Staf (tidak boleh menghapus data)";
  const ok = window.confirm(`Ubah peran "${p.nama}" menjadi ${label}?`);
  if (!ok) {
    await renderPengguna(); // kembalikan pilihan semula
    return;
  }
  await simpanPerubahan(p.id, { role: peranBaru }, `Peran ${p.nama} diubah.`);
});

requireLogin().then(() => {
  if (!isAdmin()) {
    window.location.href = "dashboard.html";
    return;
  }
  renderShell("pengguna", "Kelola Pengguna");
  renderPengguna();
});
