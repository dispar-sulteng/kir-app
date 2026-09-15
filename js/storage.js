/* =========================================================================
   storage.js
   Lapisan data aplikasi — sekarang berbicara ke database Supabase (server,
   dibagi oleh semua perangkat) alih-alih LocalStorage (per-browser).

   PENTING: karena datanya sekarang di server dan dipakai bersama oleh
   semua pengguna, SEMUA fungsi di file ini bersifat ASYNC (mengembalikan
   Promise). Setiap pemanggil WAJIB memakai `await`.

   Struktur tabel (lihat supabase/schema.sql):
     ruangan(id, nama, keterangan)
     aset(id, nama_barang, jenis_merek, no_seri, no_register, bahan,
          tahun_perolehan, kode_barang)
     inventaris_kir(id, aset_id, ruangan_id, tahun_kir, semester_kir,
                     jumlah, kondisi, keterangan)
     identitas(id=1, organisasi, provinsi, pengguna_barang, ...)

   Sesi login (kir_logged_in) TETAP disimpan di LocalStorage — ini sengaja,
   karena login di aplikasi ini hanya gerbang sederhana di sisi browser,
   bukan sesi pengguna sungguhan yang perlu dibagi antar perangkat.
   ========================================================================= */

const STORAGE_KEYS = {
  SESSION: "kir_logged_in",
  USER: "kir_user",
};

function generateId(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* -------------------------------------------------------------------------
   MAPPING: baris database (snake_case) <-> objek aplikasi (camelCase)
   ------------------------------------------------------------------------- */
function rowToRuangan(row) {
  return { id: row.id, nama: row.nama, keterangan: row.keterangan || "" };
}
function ruanganToRow(data) {
  return { nama: data.nama, keterangan: data.keterangan || "" };
}

function rowToAset(row) {
  return {
    id: row.id,
    namaBarang: row.nama_barang,
    jenisMerek: row.jenis_merek || "-",
    noSeri: row.no_seri || "-",
    noRegister: row.no_register || "-",
    bahan: row.bahan || "-",
    tahunPerolehan: row.tahun_perolehan,
    kodeBarang: row.kode_barang || "-",
  };
}
function asetToRow(data) {
  return {
    nama_barang: data.namaBarang,
    jenis_merek: data.jenisMerek || "-",
    no_seri: data.noSeri || "-",
    no_register: data.noRegister || "-",
    bahan: data.bahan || "-",
    tahun_perolehan: data.tahunPerolehan,
    kode_barang: data.kodeBarang || "-",
  };
}

function rowToInventaris(row) {
  return {
    id: row.id,
    asetId: row.aset_id,
    ruanganId: row.ruangan_id,
    tahunKir: row.tahun_kir,
    semesterKir: row.semester_kir,
    jumlah: row.jumlah,
    kondisi: row.kondisi,
    keterangan: row.keterangan || "",
  };
}
function inventarisToRow(data) {
  return {
    aset_id: data.asetId,
    ruangan_id: data.ruanganId,
    tahun_kir: data.tahunKir,
    semester_kir: data.semesterKir,
    jumlah: data.jumlah,
    kondisi: data.kondisi,
    keterangan: data.keterangan || "",
  };
}

function rowToIdentitas(row) {
  return {
    organisasi: row.organisasi || "",
    provinsi: row.provinsi || "",
    penggunaBarang: row.pengguna_barang || "",
    nipPenggunaBarang: row.nip_pengguna_barang || "",
    pengurusBarang: row.pengurus_barang || "",
    nipPengurusBarang: row.nip_pengurus_barang || "",
    penanggungJawab: row.penanggung_jawab || "",
    nipPenanggungJawab: row.nip_penanggung_jawab || "",
    kota: row.kota || "",
    tanggal: row.tanggal || "",
  };
}
function identitasToRow(data) {
  return {
    organisasi: data.organisasi || "",
    provinsi: data.provinsi || "",
    pengguna_barang: data.penggunaBarang || "",
    nip_pengguna_barang: data.nipPenggunaBarang || "",
    pengurus_barang: data.pengurusBarang || "",
    nip_pengurus_barang: data.nipPengurusBarang || "",
    penanggung_jawab: data.penanggungJawab || "",
    nip_penanggung_jawab: data.nipPenanggungJawab || "",
    kota: data.kota || "",
    tanggal: data.tanggal || null,
  };
}

/* -------------------------------------------------------------------------
   Helper: lempar error yang jelas kalau Supabase belum dikonfigurasi atau
   permintaan gagal, supaya mudah didiagnosis lewat toast/console.
   ------------------------------------------------------------------------- */
function cekError(error, konteks) {
  if (error) {
    console.error(`[Supabase] Gagal ${konteks}:`, error.message || error);
    throw new Error(`Gagal ${konteks}: ${error.message || "periksa koneksi/konfigurasi Supabase."}`);
  }
}

/* -------------------------------------------------------------------------
   RUANGAN
   ------------------------------------------------------------------------- */
async function getRuanganList() {
  const { data, error } = await supabaseClient.from("ruangan").select("*").order("nama");
  cekError(error, "mengambil data ruangan");
  return (data || []).map(rowToRuangan);
}

async function getRuanganById(id) {
  const { data, error } = await supabaseClient.from("ruangan").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToRuangan(data);
}

async function addRuangan(data) {
  const id = generateId("ruang");
  const { error } = await supabaseClient.from("ruangan").insert({ id, ...ruanganToRow(data) });
  cekError(error, "menambahkan ruangan");
  return id;
}

async function updateRuangan(id, data) {
  const { error } = await supabaseClient.from("ruangan").update(ruanganToRow(data)).eq("id", id);
  cekError(error, "memperbarui ruangan");
}

async function deleteRuangan(id) {
  const { error } = await supabaseClient.from("ruangan").delete().eq("id", id);
  cekError(error, "menghapus ruangan");
}

async function isRuanganDipakai(id) {
  const { count, error } = await supabaseClient
    .from("inventaris_kir")
    .select("id", { count: "exact", head: true })
    .eq("ruangan_id", id);
  if (error) return false;
  return (count || 0) > 0;
}

/* -------------------------------------------------------------------------
   ASET (katalog master barang)
   ------------------------------------------------------------------------- */
async function getAsetList() {
  const { data, error } = await supabaseClient.from("aset").select("*").order("nama_barang");
  cekError(error, "mengambil data aset");
  return (data || []).map(rowToAset);
}

async function getAsetById(id) {
  const { data, error } = await supabaseClient.from("aset").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToAset(data);
}

async function addAset(data) {
  const id = generateId("aset");
  const { error } = await supabaseClient.from("aset").insert({ id, ...asetToRow(data) });
  cekError(error, "menambahkan aset");
  return id;
}

async function updateAset(id, data) {
  const { error } = await supabaseClient.from("aset").update(asetToRow(data)).eq("id", id);
  cekError(error, "memperbarui aset");
}

async function deleteAset(id) {
  const { error } = await supabaseClient.from("aset").delete().eq("id", id);
  cekError(error, "menghapus aset");
}

async function jumlahPemakaianAset(asetId) {
  const { count, error } = await supabaseClient
    .from("inventaris_kir")
    .select("id", { count: "exact", head: true })
    .eq("aset_id", asetId);
  if (error) return 0;
  return count || 0;
}

/* -------------------------------------------------------------------------
   INVENTARIS KIR (pencatatan barang pada satu Kartu Inventaris Ruangan)
   ------------------------------------------------------------------------- */
async function getInventarisList() {
  const { data, error } = await supabaseClient.from("inventaris_kir").select("*");
  cekError(error, "mengambil data inventaris");
  return (data || []).map(rowToInventaris);
}

async function getInventarisById(id) {
  const { data, error } = await supabaseClient.from("inventaris_kir").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToInventaris(data);
}

async function addInventaris(data) {
  const id = generateId("inv");
  const { error } = await supabaseClient.from("inventaris_kir").insert({ id, ...inventarisToRow(data) });
  cekError(error, "menambahkan pencatatan barang");
  return id;
}

async function updateInventaris(id, data) {
  const { error } = await supabaseClient.from("inventaris_kir").update(inventarisToRow(data)).eq("id", id);
  cekError(error, "memperbarui pencatatan barang");
}

async function deleteInventaris(id) {
  const { error } = await supabaseClient.from("inventaris_kir").delete().eq("id", id);
  cekError(error, "menghapus pencatatan barang");
}

/* ---------- Gabungan (join) inventaris + aset + ruangan, memakai relasi
   foreign key yang sudah didefinisikan di schema.sql ---------- */
function petakanBarisGabungan(row) {
  const aset = row.aset || {};
  const ruangan = row.ruangan || null;
  return {
    id: row.id,
    asetId: row.aset_id,
    ruanganId: row.ruangan_id,
    tahunKir: row.tahun_kir,
    semesterKir: row.semester_kir,
    jumlah: row.jumlah,
    kondisi: row.kondisi,
    keterangan: row.keterangan || "",
    namaBarang: aset.nama_barang || "(aset tidak ditemukan)",
    jenisMerek: aset.jenis_merek || "-",
    noSeri: aset.no_seri || "-",
    noRegister: aset.no_register || "-",
    bahan: aset.bahan || "-",
    tahunPerolehan: aset.tahun_perolehan,
    kodeBarang: aset.kode_barang || "-",
    namaRuangan: ruangan ? ruangan.nama : "(ruangan dihapus)",
  };
}

async function getInventarisJoined() {
  const { data, error } = await supabaseClient.from("inventaris_kir").select("*, aset(*), ruangan(*)");
  cekError(error, "mengambil data inventaris (gabungan)");
  return (data || []).map(petakanBarisGabungan);
}

/* ---------- Query utama: SEMUA baris untuk satu kombinasi ruangan+tahun
   KIR+semester. Dipakai baik oleh tabel Data Inventaris (filter) maupun
   Cetak KIR — TIDAK ADA pembatasan jumlah (no .limit()) supaya hasil
   cetak selalu lengkap. ---------- */
async function getInventarisByKartu(ruanganId, tahunKir, semesterKir) {
  const { data, error } = await supabaseClient
    .from("inventaris_kir")
    .select("*, aset(*), ruangan(*)")
    .eq("ruangan_id", ruanganId)
    .eq("tahun_kir", Number(tahunKir))
    .eq("semester_kir", semesterKir);
  cekError(error, "mengambil data untuk cetak KIR");
  return (data || []).map(petakanBarisGabungan);
}

async function getDistinctTahunKirList() {
  const { data, error } = await supabaseClient.from("inventaris_kir").select("tahun_kir");
  if (error) return [];
  const tahunSet = new Set((data || []).map((r) => Number(r.tahun_kir)));
  return Array.from(tahunSet).sort((a, b) => b - a);
}

/* -------------------------------------------------------------------------
   ARSIP KARTU
   Satu "kartu" ditentukan oleh kombinasi Ruangan + Tahun KIR + Semester KIR.
   ------------------------------------------------------------------------- */
async function getKartuArsipList() {
  const [inventaris, ruanganList] = await Promise.all([getInventarisList(), getRuanganList()]);
  const ruanganMap = Object.fromEntries(ruanganList.map((r) => [r.id, r]));
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
    const ra = ruanganMap[a.ruanganId];
    const rb = ruanganMap[b.ruanganId];
    return (ra ? ra.nama : "").localeCompare(rb ? rb.nama : "");
  });
}

/* -------------------------------------------------------------------------
   IDENTITAS KIR (satu baris pengaturan bersama, id tetap = 1)
   ------------------------------------------------------------------------- */
async function getIdentitas() {
  const { data, error } = await supabaseClient.from("identitas").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    return {
      organisasi: "", provinsi: "", penggunaBarang: "", nipPenggunaBarang: "",
      pengurusBarang: "", nipPengurusBarang: "", penanggungJawab: "",
      nipPenanggungJawab: "", kota: "", tanggal: "",
    };
  }
  return rowToIdentitas(data);
}

async function saveIdentitas(data) {
  const { error } = await supabaseClient.from("identitas").upsert({ id: 1, ...identitasToRow(data) });
  cekError(error, "menyimpan identitas kartu");
}
