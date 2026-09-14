/* =========================================================================
   storage.js
   Lapisan data aplikasi. Semua data disimpan di LocalStorage browser
   sehingga tidak hilang saat halaman di-refresh, dan tidak membutuhkan
   server/backend apa pun untuk prototype ini.

   STRUKTUR DATA (v2 — ternormalisasi)
   -----------------------------------
   ruangan
     id, nama, keterangan

   aset  (KATALOG MASTER BARANG — identitas permanen barang, TIDAK terikat
          ruangan atau tahun KIR tertentu)
     id, namaBarang, jenisMerek, noSeri, noRegister, bahan,
     tahunPerolehan, kodeBarang

   inventaris_kir  (PENCATATAN pada satu Kartu Inventaris Ruangan tertentu —
                    relasi many-to-one ke `aset`, sehingga satu aset yang
                    sama BISA tercatat pada beberapa KIR/tahun berbeda)
     id, asetId, ruanganId, tahunKir, semesterKir,
     jumlah, kondisi, keterangan

   Satu "kartu KIR" secara konsep adalah kombinasi (ruanganId, tahunKir,
   semesterKir) — tidak perlu tabel terpisah untuk kartu, cukup dikelompokkan
   dari baris inventaris_kir yang memiliki kombinasi tersebut.
   ========================================================================= */

const STORAGE_KEYS = {
  RUANGAN: "kir_ruangan",
  ASET: "kir_aset",
  INVENTARIS: "kir_inventaris_kir",
  IDENTITAS: "kir_identitas",
  SESSION: "kir_logged_in",
  USER: "kir_user",
  // Key lama (versi sebelum aset & inventaris_kir dipisah). Dibiarkan apa
  // adanya sebagai cadangan — TIDAK dihapus — hanya sudah tidak dibaca lagi
  // oleh aplikasi setelah migrasi berhasil.
  LEGACY_BARANG: "kir_barang",
};

function generateId(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* -------------------------------------------------------------------------
   SEED DATA
   Data contoh diisi otomatis saat aplikasi pertama kali dijalankan,
   diambil dari contoh KIR ruangan "Lobby Bawah", Semester I Tahun 2024.
   ------------------------------------------------------------------------- */
function seedDataIfEmpty() {
  if (!localStorage.getItem(STORAGE_KEYS.RUANGAN)) {
    const ruanganAwal = [
      {
        id: "ruang-lobby-bawah",
        nama: "Lobby Bawah",
        keterangan: "Area lobby lantai dasar kantor",
      },
    ];
    localStorage.setItem(STORAGE_KEYS.RUANGAN, JSON.stringify(ruanganAwal));
  }

  const asetKosong = !localStorage.getItem(STORAGE_KEYS.ASET);
  const inventarisKosong = !localStorage.getItem(STORAGE_KEYS.INVENTARIS);

  // Hanya seed contoh baru jika BENAR-BENAR belum ada data aset/inventaris
  // sama sekali DAN tidak ada data lama untuk dimigrasikan.
  if (asetKosong && inventarisKosong && !localStorage.getItem(STORAGE_KEYS.LEGACY_BARANG)) {
    const rid = "ruang-lobby-bawah";
    const asetAwal = [
      { id: generateId("aset"), namaBarang: "Lemari Laci Interior", jenisMerek: "Kayu", noSeri: "-", noRegister: "-", bahan: "Kayu", tahunPerolehan: 2019, kodeBarang: "-" },
      { id: generateId("aset"), namaBarang: "Lemari Absen Retina", jenisMerek: "Kayu", noSeri: "-", noRegister: "-", bahan: "Kayu", tahunPerolehan: 2019, kodeBarang: "-" },
      { id: generateId("aset"), namaBarang: "Meja Kerja", jenisMerek: "Kayu", noSeri: "-", noRegister: "-", bahan: "Kayu", tahunPerolehan: 1989, kodeBarang: "-" },
      { id: generateId("aset"), namaBarang: "Kursi Rapat Merah", jenisMerek: "-", noSeri: "-", noRegister: "-", bahan: "-", tahunPerolehan: 2019, kodeBarang: "-" },
      { id: generateId("aset"), namaBarang: "Kursi Merah Panjang", jenisMerek: "-", noSeri: "-", noRegister: "-", bahan: "-", tahunPerolehan: 2014, kodeBarang: "-" },
      { id: generateId("aset"), namaBarang: "TV", jenisMerek: "-", noSeri: "-", noRegister: "-", bahan: "-", tahunPerolehan: 2021, kodeBarang: "-" },
      { id: generateId("aset"), namaBarang: "TV Monitor CCTV", jenisMerek: "LG", noSeri: "-", noRegister: "-", bahan: "-", tahunPerolehan: 2017, kodeBarang: "-" },
    ];
    const jumlahAwal = [1, 2, 1, 4, 1, 1, 1];

    const inventarisAwal = asetAwal.map((a, idx) => ({
      id: generateId("inv"),
      asetId: a.id,
      ruanganId: rid,
      tahunKir: 2024,
      semesterKir: "Semester I",
      jumlah: jumlahAwal[idx],
      kondisi: "Baik",
      keterangan: "Koridor Bawah",
    }));

    localStorage.setItem(STORAGE_KEYS.ASET, JSON.stringify(asetAwal));
    localStorage.setItem(STORAGE_KEYS.INVENTARIS, JSON.stringify(inventarisAwal));
  }

  if (!localStorage.getItem(STORAGE_KEYS.IDENTITAS)) {
    const identitasAwal = {
      organisasi: "Dinas Pariwisata Provinsi Sulawesi Tengah",
      provinsi: "Sulawesi Tengah",
      penggunaBarang: "",
      nipPenggunaBarang: "",
      pengurusBarang: "",
      nipPengurusBarang: "",
      penanggungJawab: "",
      nipPenanggungJawab: "",
      kota: "Palu",
      tanggal: "",
    };
    localStorage.setItem(STORAGE_KEYS.IDENTITAS, JSON.stringify(identitasAwal));
  }

  migrateLegacyBarangIfNeeded();
}

/* -------------------------------------------------------------------------
   MIGRASI DATA LAMA (kir_barang -> kir_aset + kir_inventaris_kir)
   Versi sebelumnya menyimpan identitas barang dan data periode KIR
   (tahunKartu/semesterKartu) dalam SATU baris yang sama, sehingga barang
   yang sama tidak bisa tercatat di dua KIR/tahun berbeda tanpa duplikasi.
   Migrasi ini memecah setiap baris lama menjadi:
     1 baris `aset`           -> identitas barang (permanen)
     1 baris `inventaris_kir` -> pencatatan pada KIR ruangan+tahun+semester
   Key lama TIDAK dihapus (dibiarkan sebagai cadangan), migrasi hanya
   dijalankan sekali (ditandai lewat flag di localStorage).
   ------------------------------------------------------------------------- */
function migrateLegacyBarangIfNeeded() {
  const sudahDimigrasi = localStorage.getItem("kir_migrasi_v2_selesai") === "true";
  const dataLama = localStorage.getItem(STORAGE_KEYS.LEGACY_BARANG);
  if (sudahDimigrasi || !dataLama) return;

  let barangLama;
  try {
    barangLama = JSON.parse(dataLama);
  } catch (e) {
    barangLama = [];
  }

  if (Array.isArray(barangLama) && barangLama.length > 0) {
    const asetBaru = [];
    const inventarisBaru = [];
    const tahunSekarang = new Date().getFullYear();

    barangLama.forEach((b) => {
      const asetId = generateId("aset");
      asetBaru.push({
        id: asetId,
        namaBarang: b.namaBarang,
        jenisMerek: b.jenisMerek || "-",
        noSeri: b.noSeri || "-",
        noRegister: b.noRegister || "-",
        bahan: b.bahan || "-",
        tahunPerolehan: Number(b.tahun) || tahunSekarang,
        kodeBarang: b.kodeBarang || "-",
      });
      inventarisBaru.push({
        id: generateId("inv"),
        asetId: asetId,
        ruanganId: b.ruanganId,
        tahunKir: Number(b.tahunKartu) || tahunSekarang,
        semesterKir: b.semesterKartu || "Semester I",
        jumlah: Number(b.jumlah) || 1,
        kondisi: b.kondisi || "Baik",
        keterangan: b.keterangan || "",
      });
    });

    // Gabung dengan data aset/inventaris yang mungkin sudah ada (jika migrasi
    // dijalankan setelah pengguna sempat menambah data dengan struktur baru).
    const asetSekarang = getAsetList();
    const inventarisSekarang = getInventarisList();
    saveAsetList([...asetSekarang, ...asetBaru]);
    saveInventarisList([...inventarisSekarang, ...inventarisBaru]);
  }

  localStorage.setItem("kir_migrasi_v2_selesai", "true");
}

/* -------------------------------------------------------------------------
   RUANGAN
   ------------------------------------------------------------------------- */
function getRuanganList() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.RUANGAN) || "[]");
}

function saveRuanganList(list) {
  localStorage.setItem(STORAGE_KEYS.RUANGAN, JSON.stringify(list));
}

function getRuanganById(id) {
  return getRuanganList().find((r) => r.id === id) || null;
}

function addRuangan(data) {
  const list = getRuanganList();
  list.push({ id: generateId("ruang"), nama: data.nama, keterangan: data.keterangan || "" });
  saveRuanganList(list);
}

function updateRuangan(id, data) {
  const list = getRuanganList();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], nama: data.nama, keterangan: data.keterangan || "" };
  saveRuanganList(list);
}

function deleteRuangan(id) {
  saveRuanganList(getRuanganList().filter((r) => r.id !== id));
}

function isRuanganDipakai(id) {
  return getInventarisList().some((inv) => inv.ruanganId === id);
}

/* -------------------------------------------------------------------------
   ASET (katalog master barang)
   ------------------------------------------------------------------------- */
function getAsetList() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ASET) || "[]");
}

function saveAsetList(list) {
  localStorage.setItem(STORAGE_KEYS.ASET, JSON.stringify(list));
}

function getAsetById(id) {
  return getAsetList().find((a) => a.id === id) || null;
}

function addAset(data) {
  const list = getAsetList();
  const id = generateId("aset");
  list.push({ id, ...data });
  saveAsetList(list);
  return id;
}

function updateAset(id, data) {
  const list = getAsetList();
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...data };
  saveAsetList(list);
}

function deleteAset(id) {
  saveAsetList(getAsetList().filter((a) => a.id !== id));
}

function jumlahPemakaianAset(asetId) {
  return getInventarisList().filter((inv) => inv.asetId === asetId).length;
}

/* -------------------------------------------------------------------------
   INVENTARIS KIR (pencatatan barang pada satu Kartu Inventaris Ruangan)
   ------------------------------------------------------------------------- */
function getInventarisList() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTARIS) || "[]");
}

function saveInventarisList(list) {
  localStorage.setItem(STORAGE_KEYS.INVENTARIS, JSON.stringify(list));
}

function getInventarisById(id) {
  return getInventarisList().find((inv) => inv.id === id) || null;
}

function addInventaris(data) {
  const list = getInventarisList();
  list.push({ id: generateId("inv"), ...data });
  saveInventarisList(list);
}

function updateInventaris(id, data) {
  const list = getInventarisList();
  const idx = list.findIndex((inv) => inv.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...data };
  saveInventarisList(list);
}

function deleteInventaris(id) {
  saveInventarisList(getInventarisList().filter((inv) => inv.id !== id));
}

/* -------------------------------------------------------------------------
   JOIN: gabungkan baris inventaris_kir dengan data aset & ruangan supaya
   mudah ditampilkan di tabel (tanpa mengubah data tersimpan).
   ------------------------------------------------------------------------- */
function getInventarisJoined() {
  const asetMap = Object.fromEntries(getAsetList().map((a) => [a.id, a]));
  const ruanganMap = Object.fromEntries(getRuanganList().map((r) => [r.id, r]));

  return getInventarisList().map((inv) => {
    const aset = asetMap[inv.asetId] || {};
    const ruangan = ruanganMap[inv.ruanganId] || null;
    return {
      ...inv,
      namaBarang: aset.namaBarang || "(aset tidak ditemukan)",
      jenisMerek: aset.jenisMerek || "-",
      noSeri: aset.noSeri || "-",
      noRegister: aset.noRegister || "-",
      bahan: aset.bahan || "-",
      tahunPerolehan: aset.tahunPerolehan,
      kodeBarang: aset.kodeBarang || "-",
      namaRuangan: ruangan ? ruangan.nama : "(ruangan dihapus)",
    };
  });
}

/* ---------- Query utama: SEMUA baris untuk satu kombinasi ruangan+tahun
   KIR+semester. Dipakai baik oleh tabel Data Inventaris (filter) maupun
   Cetak KIR — TIDAK ADA pembatasan jumlah (no slice/limit) supaya hasil
   cetak selalu lengkap. ---------- */
function getInventarisByKartu(ruanganId, tahunKir, semesterKir) {
  return getInventarisJoined().filter(
    (inv) =>
      inv.ruanganId === ruanganId &&
      Number(inv.tahunKir) === Number(tahunKir) &&
      inv.semesterKir === semesterKir
  );
}

function getDistinctTahunKirList() {
  const tahunSet = new Set(getInventarisList().map((inv) => Number(inv.tahunKir)));
  return Array.from(tahunSet).sort((a, b) => b - a);
}

/* -------------------------------------------------------------------------
   ARSIP KARTU
   Satu "kartu" ditentukan oleh kombinasi Ruangan + Tahun KIR + Semester KIR.
   Karena satu ruangan bisa memiliki banyak kartu dari periode/tahun
   berbeda (untuk kepentingan arsip), fungsi ini mengelompokkan data
   inventaris_kir berdasarkan kombinasi tersebut.
   ------------------------------------------------------------------------- */
function getKartuArsipList() {
  const inventaris = getInventarisList();
  const map = new Map();

  inventaris.forEach((inv) => {
    const key = `${inv.ruanganId}|${inv.tahunKir}|${inv.semesterKir}`;
    if (!map.has(key)) {
      map.set(key, {
        ruanganId: inv.ruanganId,
        tahunKir: inv.tahunKir,
        semesterKir: inv.semesterKir,
        jumlahJenis: 0,
        totalUnit: 0,
      });
    }
    const entry = map.get(key);
    entry.jumlahJenis += 1;
    entry.totalUnit += Number(inv.jumlah || 0);
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.tahunKir !== b.tahunKir) return b.tahunKir - a.tahunKir;
    if (a.semesterKir !== b.semesterKir) return a.semesterKir.localeCompare(b.semesterKir);
    const ra = getRuanganById(a.ruanganId);
    const rb = getRuanganById(b.ruanganId);
    return (ra ? ra.nama : "").localeCompare(rb ? rb.nama : "");
  });
}

/* -------------------------------------------------------------------------
   IDENTITAS KIR (data default yang dipakai di halaman Kartu Inventaris Ruangan)
   ------------------------------------------------------------------------- */
function getIdentitas() {
  return JSON.parse(
    localStorage.getItem(STORAGE_KEYS.IDENTITAS) ||
      '{"organisasi":"","provinsi":"","penggunaBarang":"","nipPenggunaBarang":"","pengurusBarang":"","nipPengurusBarang":"","penanggungJawab":"","nipPenanggungJawab":"","kota":"","tanggal":""}'
  );
}

function saveIdentitas(data) {
  localStorage.setItem(STORAGE_KEYS.IDENTITAS, JSON.stringify(data));
}
