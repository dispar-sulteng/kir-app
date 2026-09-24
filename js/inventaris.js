/* =========================================================================
   inventaris.js
   ========================================================================= */

requireLogin();
renderShell("inventaris", "Data Inventaris");

const tbody = document.getElementById("tabel-barang-body");
const filterSearch = document.getElementById("filter-search");
const filterRuangan = document.getElementById("filter-ruangan");
const filterTahunKir = document.getElementById("filter-tahun-kir");
const filterSemesterKir = document.getElementById("filter-semester-kir");
const filterKondisi = document.getElementById("filter-kondisi");

const modalBarang = document.getElementById("modal-barang");
const formBarang = document.getElementById("form-barang");
const modalBarangTitle = document.getElementById("modal-barang-title");
const selectRuanganBarang = document.getElementById("barang-ruangan");
const selectKatalog = document.getElementById("pilih-katalog");
const wrapPilihKatalog = document.getElementById("wrap-pilih-katalog");
const infoPemakaianAset = document.getElementById("info-pemakaian-aset");
const radioBaru = document.getElementById("sumber-aset-baru");
const radioKatalog = document.getElementById("sumber-aset-katalog");

const identityFieldIds = [
  "barang-nama",
  "barang-jenis",
  "barang-bahan",
  "barang-noseri",
  "barang-noregister",
  "barang-tahun-perolehan",
  "barang-kode",
];

const modalLihat = document.getElementById("modal-lihat");
const modalLihatBody = document.getElementById("modal-lihat-body");

/* ---------- isi opsi dropdown ruangan (filter + form) ---------- */
async function refreshRuanganOptions() {
  const ruanganList = await getRuanganList();
  const optionsHtml = ruanganList.map((r) => `<option value="${r.id}">${escapeHtml(r.nama)}</option>`).join("");

  filterRuangan.innerHTML = `<option value="">Semua Ruangan</option>` + optionsHtml;
  selectRuanganBarang.innerHTML =
    ruanganList.length > 0
      ? optionsHtml
      : `<option value="" disabled selected>Belum ada ruangan</option>`;
  return ruanganList;
}

/* ---------- isi opsi filter Tahun KIR (data-driven) ---------- */
async function refreshTahunKirFilterOptions() {
  const tahunTersedia = await getDistinctTahunKirList();
  const selectedSaatIni = filterTahunKir.value;

  filterTahunKir.innerHTML =
    `<option value="">Semua Tahun KIR</option>` +
    tahunTersedia.map((t) => `<option value="${t}">${t}</option>`).join("");

  if (tahunTersedia.map(String).includes(selectedSaatIni)) {
    filterTahunKir.value = selectedSaatIni;
  }
}

/* ---------- isi dropdown katalog aset ---------- */
async function refreshKatalogOptions() {
  const asetList = await getAsetList();
  selectKatalog.innerHTML =
    asetList.length > 0
      ? `<option value="" disabled selected>Pilih barang...</option>` +
        asetList
          .map(
            (a) =>
              `<option value="${a.id}">${escapeHtml(a.namaBarang)} — ${escapeHtml(a.jenisMerek || "-")} (${escapeHtml(a.tahunPerolehan || "-")})</option>`
          )
          .join("")
      : `<option value="" disabled selected>Belum ada barang di katalog</option>`;
}

/* ---------- render tabel ---------- */
async function renderTabel() {
  tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><p>Memuat data...</p></div></td></tr>`;

  let joined;
  try {
    joined = await getInventarisJoined();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state" style="color:var(--bad-text);"><p>Gagal memuat data: ${escapeHtml(err.message)}</p></div></td></tr>`;
    return;
  }

  const keyword = filterSearch.value.trim().toLowerCase();
  const ruanganFilter = filterRuangan.value;
  const tahunKirFilter = filterTahunKir.value;
  const semesterKirFilter = filterSemesterKir.value;
  const kondisiFilter = filterKondisi.value;

  const filtered = joined.filter((inv) => {
    const cocokKeyword = !keyword || inv.namaBarang.toLowerCase().includes(keyword);
    const cocokRuangan = !ruanganFilter || inv.ruanganId === ruanganFilter;
    const cocokTahunKir = !tahunKirFilter || Number(inv.tahunKir) === Number(tahunKirFilter);
    const cocokSemesterKir = !semesterKirFilter || inv.semesterKir === semesterKirFilter;
    const cocokKondisi = !kondisiFilter || inv.kondisi === kondisiFilter;
    return cocokKeyword && cocokRuangan && cocokTahunKir && cocokSemesterKir && cocokKondisi;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="10">
        <div class="empty-state">
          <p>Tidak ada data barang yang sesuai.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (inv, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(inv.namaBarang)}</td>
        <td>${escapeHtml(inv.jenisMerek || "-")}</td>
        <td>${escapeHtml(inv.tahunPerolehan || "-")}</td>
        <td>${escapeHtml(inv.jumlah)}</td>
        <td><span class="${kondisiBadgeClass(inv.kondisi)}">${escapeHtml(inv.kondisi)}</span></td>
        <td>${escapeHtml(inv.namaRuangan)}</td>
        <td>${escapeHtml(inv.semesterKir)} &middot; ${escapeHtml(inv.tahunKir)}</td>
        <td>${escapeHtml(inv.keterangan || "-")}</td>
        <td>
          <div class="col-actions">
            <button class="btn btn-secondary btn-sm" data-action="lihat" data-id="${inv.id}">Lihat</button>
            <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${inv.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-action="hapus" data-id="${inv.id}">Hapus</button>
          </div>
        </td>
      </tr>`
    )
    .join("");
}

/* ---------- toggle sumber aset: baru vs katalog ---------- */
async function setModeSumberAset(mode) {
  const isKatalog = mode === "katalog";
  wrapPilihKatalog.style.display = isKatalog ? "block" : "none";

  if (isKatalog) {
    await refreshKatalogOptions();
  } else {
    document.getElementById("aset-id").value = "";
    infoPemakaianAset.style.display = "none";
    identityFieldIds.forEach((id) => {
      document.getElementById(id).value = "";
      document.getElementById(id).disabled = false;
    });
  }
}

radioBaru.addEventListener("change", () => setModeSumberAset("baru"));
radioKatalog.addEventListener("change", () => setModeSumberAset("katalog"));

selectKatalog.addEventListener("change", async () => {
  const aset = await getAsetById(selectKatalog.value);
  if (!aset) return;
  document.getElementById("aset-id").value = aset.id;
  document.getElementById("barang-nama").value = aset.namaBarang;
  document.getElementById("barang-jenis").value = aset.jenisMerek || "";
  document.getElementById("barang-bahan").value = aset.bahan || "";
  document.getElementById("barang-noseri").value = aset.noSeri || "";
  document.getElementById("barang-noregister").value = aset.noRegister || "";
  document.getElementById("barang-tahun-perolehan").value = aset.tahunPerolehan || "";
  document.getElementById("barang-kode").value = aset.kodeBarang || "";

  const jumlahDipakai = await jumlahPemakaianAset(aset.id);
  if (jumlahDipakai > 0) {
    infoPemakaianAset.style.display = "block";
    infoPemakaianAset.textContent = `Barang ini sudah tercatat di ${jumlahDipakai} KIR lain. Mengubah data identitas (nama/jenis/dll) di bawah akan ikut mengubah data pada seluruh KIR tersebut.`;
  } else {
    infoPemakaianAset.style.display = "none";
  }
});

/* ---------- modal tambah / edit ---------- */
function resetFormErrors() {
  ["barang-nama", "barang-tahun-perolehan", "barang-jumlah", "barang-ruangan", "barang-tahun-kir"].forEach((id) => {
    document.getElementById(id).classList.remove("invalid");
  });
  document.querySelectorAll("#form-barang .field-error").forEach((el) => el.classList.remove("show"));
}

async function openModalTambah() {
  const ruanganList = await refreshRuanganOptions();
  if (ruanganList.length === 0) {
    showToast("Tambahkan data ruangan terlebih dahulu sebelum menambah barang.", "danger");
    return;
  }
  resetFormErrors();
  formBarang.reset();
  document.getElementById("inventaris-id").value = "";
  document.getElementById("aset-id").value = "";
  document.getElementById("barang-kondisi").value = "Baik";
  document.getElementById("barang-semester-kir").value = "Semester I";
  document.getElementById("barang-tahun-kir").value = new Date().getFullYear();
  radioBaru.checked = true;
  await setModeSumberAset("baru");
  modalBarangTitle.textContent = "Tambah Barang";
  modalBarang.classList.add("show");
}

async function openModalEdit(id) {
  const inv = await getInventarisById(id);
  if (!inv) return;
  const aset = await getAsetById(inv.asetId);
  if (!aset) return;

  resetFormErrors();
  await refreshRuanganOptions();

  document.getElementById("inventaris-id").value = inv.id;
  document.getElementById("aset-id").value = aset.id;

  radioKatalog.checked = true;
  wrapPilihKatalog.style.display = "none"; // saat edit, aset sumber sudah ditentukan (tidak perlu pilih ulang)

  document.getElementById("barang-nama").value = aset.namaBarang;
  document.getElementById("barang-jenis").value = aset.jenisMerek || "";
  document.getElementById("barang-bahan").value = aset.bahan || "";
  document.getElementById("barang-noseri").value = aset.noSeri || "";
  document.getElementById("barang-noregister").value = aset.noRegister || "";
  document.getElementById("barang-tahun-perolehan").value = aset.tahunPerolehan || "";
  document.getElementById("barang-kode").value = aset.kodeBarang || "";

  const jumlahDipakai = await jumlahPemakaianAset(aset.id);
  if (jumlahDipakai > 1) {
    infoPemakaianAset.style.display = "block";
    infoPemakaianAset.textContent = `Barang ini tercatat di ${jumlahDipakai} KIR (termasuk yang sedang diedit). Mengubah data identitas akan ikut mengubah data pada KIR lain yang memakai barang yang sama.`;
  } else {
    infoPemakaianAset.style.display = "none";
  }

  selectRuanganBarang.value = inv.ruanganId;
  document.getElementById("barang-semester-kir").value = inv.semesterKir;
  document.getElementById("barang-tahun-kir").value = inv.tahunKir;
  document.getElementById("barang-jumlah").value = inv.jumlah;
  document.getElementById("barang-kondisi").value = inv.kondisi;
  document.getElementById("barang-keterangan").value = inv.keterangan || "";

  modalBarangTitle.textContent = "Edit Barang";
  modalBarang.classList.add("show");
}

function closeModalBarang() {
  modalBarang.classList.remove("show");
}

formBarang.addEventListener("submit", async (e) => {
  e.preventDefault();
  resetFormErrors();

  const nama = document.getElementById("barang-nama").value.trim();
  const tahunPerolehan = document.getElementById("barang-tahun-perolehan").value;
  const jumlah = document.getElementById("barang-jumlah").value.trim();
  const ruanganId = selectRuanganBarang.value;
  const tahunKir = document.getElementById("barang-tahun-kir").value;

  let valid = true;
  if (!nama) {
    document.getElementById("barang-nama").classList.add("invalid");
    document.getElementById("err-barang-nama").classList.add("show");
    valid = false;
  }
  // Tahun Perolehan boleh kosong (tidak semua barang diketahui tahunnya).
  // Kalau diisi, tetap divalidasi rentangnya supaya masuk akal.
  if (tahunPerolehan && (tahunPerolehan < 1900 || tahunPerolehan > 2100)) {
    document.getElementById("barang-tahun-perolehan").classList.add("invalid");
    document.getElementById("err-barang-tahun-perolehan").classList.add("show");
    valid = false;
  }
  if (!jumlah) {
    document.getElementById("barang-jumlah").classList.add("invalid");
    document.getElementById("err-barang-jumlah").classList.add("show");
    valid = false;
  }
  if (!ruanganId) {
    selectRuanganBarang.classList.add("invalid");
    document.getElementById("err-barang-ruangan").classList.add("show");
    valid = false;
  }
  if (!tahunKir || tahunKir < 1990 || tahunKir > 2100) {
    document.getElementById("barang-tahun-kir").classList.add("invalid");
    document.getElementById("err-barang-tahun-kir").classList.add("show");
    valid = false;
  }
  if (!valid) return;

  const dataAset = {
    namaBarang: nama,
    jenisMerek: document.getElementById("barang-jenis").value.trim() || "-",
    bahan: document.getElementById("barang-bahan").value.trim() || "-",
    noSeri: document.getElementById("barang-noseri").value.trim() || "-",
    noRegister: document.getElementById("barang-noregister").value.trim() || "-",
    tahunPerolehan: tahunPerolehan ? Number(tahunPerolehan) : null,
    kodeBarang: document.getElementById("barang-kode").value.trim() || "-",
  };

  const submitBtn = document.getElementById("modal-barang-submit");
  submitBtn.disabled = true;

  try {
    let asetId = document.getElementById("aset-id").value;
    if (asetId) {
      await updateAset(asetId, dataAset);
    } else {
      asetId = await addAset(dataAset);
    }

    const dataInventaris = {
      asetId,
      ruanganId,
      semesterKir: document.getElementById("barang-semester-kir").value,
      tahunKir: Number(tahunKir),
      jumlah,
      kondisi: document.getElementById("barang-kondisi").value,
      keterangan: document.getElementById("barang-keterangan").value.trim(),
    };

    const invId = document.getElementById("inventaris-id").value;
    if (invId) {
      await updateInventaris(invId, dataInventaris);
      showToast("Barang berhasil diperbarui.");
    } else {
      await addInventaris(dataInventaris);
      showToast("Barang berhasil ditambahkan.");
    }

    closeModalBarang();
    await refreshTahunKirFilterOptions();
    await renderTabel();
  } catch (err) {
    showToast(err.message, "danger");
  } finally {
    submitBtn.disabled = false;
  }
});

/* ---------- lihat detail ---------- */
async function openModalLihat(id) {
  const joined = await getInventarisJoined();
  const inv = joined.find((x) => x.id === id);
  if (!inv) return;

  const rows = [
    ["Nama Barang", inv.namaBarang],
    ["Jenis / Merek", inv.jenisMerek],
    ["Bahan", inv.bahan],
    ["No Seri / Pabrik", inv.noSeri],
    ["No Register", inv.noRegister],
    ["Tahun Perolehan", inv.tahunPerolehan || "-"],
    ["Kode Barang", inv.kodeBarang],
    ["Jumlah", inv.jumlah],
    ["Kondisi", inv.kondisi],
    ["Ruangan", inv.namaRuangan],
    ["Tahun KIR", `${inv.semesterKir} · ${inv.tahunKir}`],
    ["Keterangan", inv.keterangan || "-"],
  ];

  modalLihatBody.innerHTML = `
    <div style="display:grid;grid-template-columns:170px 1fr;row-gap:10px;font-size:0.9rem;">
      ${rows
        .map(
          ([label, value]) =>
            `<div style="color:var(--text-muted);">${label}</div><div style="font-weight:600;">${escapeHtml(value)}</div>`
        )
        .join("")}
    </div>`;

  modalLihat.classList.add("show");
}

/* ---------- event delegation tombol aksi ---------- */
tbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;

  if (btn.dataset.action === "lihat") openModalLihat(id);
  if (btn.dataset.action === "edit") openModalEdit(id);
  if (btn.dataset.action === "hapus") {
    const inv = await getInventarisById(id);
    const aset = inv ? await getAsetById(inv.asetId) : null;
    const konfirmasi = window.confirm(
      `Hapus pencatatan "${aset ? aset.namaBarang : ""}" dari KIR ini?\n\nData barang di KIR/kartu lain (jika ada) tidak akan terpengaruh. Tindakan ini tidak dapat dibatalkan.`
    );
    if (konfirmasi) {
      try {
        await deleteInventaris(id);
        showToast("Barang berhasil dihapus dari kartu ini.");
        await refreshTahunKirFilterOptions();
        await renderTabel();
      } catch (err) {
        showToast(err.message, "danger");
      }
    }
  }
});

/* ---------- listener umum ---------- */
document.getElementById("btn-tambah-barang").addEventListener("click", openModalTambah);
document.getElementById("modal-barang-close").addEventListener("click", closeModalBarang);
document.getElementById("modal-barang-cancel").addEventListener("click", closeModalBarang);
document.getElementById("modal-lihat-close").addEventListener("click", () => modalLihat.classList.remove("show"));
document.getElementById("modal-lihat-tutup").addEventListener("click", () => modalLihat.classList.remove("show"));

[filterSearch, filterRuangan, filterTahunKir, filterSemesterKir, filterKondisi].forEach((el) =>
  el.addEventListener("input", renderTabel)
);

/* ---------- init ---------- */
(async function init() {
  await refreshRuanganOptions();
  await refreshTahunKirFilterOptions();
  await renderTabel();
})();
