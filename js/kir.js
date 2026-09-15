/* =========================================================================
   kir.js
   ========================================================================= */

requireLogin();
renderShell("kir", "Kartu Inventaris Ruangan");

const selectRuangan = document.getElementById("pilih-ruangan");
const selectSemester = document.getElementById("pilih-semester");
const inputTahun = document.getElementById("pilih-tahun");
const kirResult = document.getElementById("kir-result");

/* ---------- isi dropdown ruangan ---------- */
async function refreshRuanganDropdown() {
  const list = await getRuanganList();
  selectRuangan.innerHTML =
    list.length > 0
      ? list.map((r) => `<option value="${r.id}">${escapeHtml(r.nama)}</option>`).join("")
      : `<option value="" disabled selected>Belum ada ruangan</option>`;
}

/* ---------- daftar arsip kartu (ruangan + semester + tahun) ---------- */
async function renderArsipList() {
  const tbody = document.getElementById("arsip-kartu-body");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Memuat data...</td></tr>`;

  let arsip, ruanganList;
  try {
    [arsip, ruanganList] = await Promise.all([getKartuArsipList(), getRuanganList()]);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--bad-text);padding:24px;">Gagal memuat data: ${escapeHtml(err.message)}</td></tr>`;
    return;
  }
  const ruanganMap = Object.fromEntries(ruanganList.map((r) => [r.id, r]));

  if (arsip.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Belum ada kartu yang tersimpan. Tambahkan barang di menu Data Inventaris beserta periode kartunya.</td></tr>`;
    return;
  }

  tbody.innerHTML = arsip
    .map((k) => {
      const ruangan = ruanganMap[k.ruanganId];
      return `
        <tr>
          <td>${escapeHtml(ruangan ? ruangan.nama : "(ruangan dihapus)")}</td>
          <td>${escapeHtml(k.semesterKir)}</td>
          <td>${escapeHtml(k.tahunKir)}</td>
          <td>${k.jumlahJenis}</td>
          <td>${k.totalUnit}</td>
          <td>
            <button class="btn btn-secondary btn-sm" data-ruangan="${k.ruanganId}" data-semester="${escapeHtml(k.semesterKir)}" data-tahun="${k.tahunKir}">Tampilkan</button>
          </td>
        </tr>`;
    })
    .join("");

  tbody.querySelectorAll("button[data-ruangan]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectRuangan.value = btn.dataset.ruangan;
      selectSemester.value = btn.dataset.semester;
      inputTahun.value = btn.dataset.tahun;
      tampilkanKartu();
    });
  });
}

/* ---------- muat & simpan identitas ---------- */
const idFieldMap = {
  organisasi: "id-organisasi",
  provinsi: "id-provinsi",
  kota: "id-kota",
  penggunaBarang: "id-pengguna",
  nipPenggunaBarang: "id-nip-pengguna",
  tanggal: "id-tanggal",
  pengurusBarang: "id-pengurus",
  nipPengurusBarang: "id-nip-pengurus",
  penanggungJawab: "id-penanggung",
  nipPenanggungJawab: "id-nip-penanggung",
};

async function loadIdentitasForm() {
  const data = await getIdentitas();
  Object.entries(idFieldMap).forEach(([key, elId]) => {
    document.getElementById(elId).value = data[key] || "";
  });
}

function collectIdentitasForm() {
  const data = {};
  Object.entries(idFieldMap).forEach(([key, elId]) => {
    data[key] = document.getElementById(elId).value.trim();
  });
  return data;
}

document.getElementById("btn-simpan-identitas").addEventListener("click", async () => {
  try {
    await saveIdentitas(collectIdentitasForm());
    showToast("Identitas kartu berhasil disimpan.");
  } catch (err) {
    showToast(err.message, "danger");
  }
});

/* ---------- tampilkan kartu ---------- */
async function tampilkanKartu() {
  const ruanganId = selectRuangan.value;
  if (!ruanganId) {
    showToast("Pilih ruangan terlebih dahulu.", "danger");
    return;
  }
  const ruangan = await getRuanganById(ruanganId);
  const semester = selectSemester.value;
  const tahun = inputTahun.value || new Date().getFullYear();
  const identitas = collectIdentitasForm();

  try {
    await saveIdentitas(identitas);
  } catch (err) {
    showToast(err.message, "danger");
    return;
  }

  document.getElementById("doc-periode-label").textContent = `${semester} — Tahun KIR ${tahun}`;

  document.getElementById("kir-doc-meta").innerHTML = `
    <div class="lbl">Organisasi Perangkat Daerah</div><div class="sep">:</div><div class="val">${escapeHtml(identitas.organisasi || "-")}</div>
    <div class="lbl">Ruangan</div><div class="sep">:</div><div class="val">${escapeHtml(ruangan.nama)}</div>
    <div class="lbl">Provinsi</div><div class="sep">:</div><div class="val">${escapeHtml(identitas.provinsi || "-")}</div>
    <div class="lbl">Periode</div><div class="sep">:</div><div class="val">${escapeHtml(semester)}</div>
    <div class="lbl">Tahun KIR</div><div class="sep">:</div><div class="val">${escapeHtml(tahun)}</div>
  `;

  const tbody = document.getElementById("kir-table-body");
  tbody.innerHTML = `<tr><td colspan="13" style="padding:18px;">Memuat data...</td></tr>`;
  kirResult.classList.add("show");
  kirResult.scrollIntoView({ behavior: "smooth", block: "start" });

  // Ambil SEMUA baris inventaris untuk kombinasi ruangan + tahun KIR + semester
  // ini — tidak ada slice/limit di sini, sehingga hasil cetak selalu lengkap
  // walaupun jumlah barangnya banyak.
  let barangRuangan;
  try {
    barangRuangan = await getInventarisByKartu(ruanganId, tahun, semester);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="13" style="padding:18px;color:var(--bad-text);">Gagal memuat data: ${escapeHtml(err.message)}</td></tr>`;
    return;
  }

  if (barangRuangan.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" style="padding:18px;">Belum ada data barang untuk kartu <strong>${escapeHtml(ruangan.nama)} — ${escapeHtml(semester)} ${escapeHtml(tahun)}</strong>. Tambahkan barang dengan Tahun KIR ini di menu Data Inventaris, atau pilih arsip lain di atas.</td></tr>`;
  } else {
    tbody.innerHTML = barangRuangan
      .map(
        (b, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td class="text-left">${escapeHtml(b.namaBarang)}</td>
          <td>${escapeHtml(b.jenisMerek || "-")}</td>
          <td>${escapeHtml(b.noSeri || "-")}</td>
          <td>${escapeHtml(b.noRegister || "-")}</td>
          <td>${escapeHtml(b.bahan || "-")}</td>
          <td>${escapeHtml(b.tahunPerolehan)}</td>
          <td>${escapeHtml(b.kodeBarang || "-")}</td>
          <td>${escapeHtml(b.jumlah)}</td>
          <td class="cond-mark">${b.kondisi === "Baik" ? "\u2713" : ""}</td>
          <td class="cond-mark">${b.kondisi === "Kurang Baik" ? "\u2713" : ""}</td>
          <td class="cond-mark">${b.kondisi === "Rusak Berat" ? "\u2713" : ""}</td>
          <td class="text-left">${escapeHtml(b.keterangan || "-")}</td>
        </tr>`
      )
      .join("");
  }

  document.getElementById("sign-pengguna").textContent = identitas.penggunaBarang || "-";
  document.getElementById("sign-nip-pengguna").textContent = `NIP. ${identitas.nipPenggunaBarang || "-"}`;
  document.getElementById("sign-pengurus").textContent = identitas.pengurusBarang || "-";
  document.getElementById("sign-nip-pengurus").textContent = `NIP. ${identitas.nipPengurusBarang || "-"}`;
  document.getElementById("sign-penanggung").textContent = identitas.penanggungJawab || "-";
  document.getElementById("sign-nip-penanggung").textContent = `NIP. ${identitas.nipPenanggungJawab || "-"}`;
}

document.getElementById("btn-tampilkan").addEventListener("click", tampilkanKartu);
document.getElementById("btn-cetak").addEventListener("click", () => window.print());

/* ---------- init ---------- */
(async function init() {
  inputTahun.value = new Date().getFullYear();
  await refreshRuanganDropdown();
  await renderArsipList();
  await loadIdentitasForm();
})();
