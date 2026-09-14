-- =========================================================================
-- Skrip setup database Supabase untuk Sistem Informasi KIR
-- Jalankan seluruh isi file ini di Supabase SQL Editor (sekali saja).
-- =========================================================================

-- RUANGAN
create table if not exists ruangan (
  id text primary key,
  nama text not null,
  keterangan text
);

-- ASET (katalog master barang — identitas permanen, tidak terikat ruangan/tahun)
create table if not exists aset (
  id text primary key,
  nama_barang text not null,
  jenis_merek text,
  no_seri text,
  no_register text,
  bahan text,
  tahun_perolehan integer,
  kode_barang text
);

-- INVENTARIS_KIR (pencatatan pada satu KIR: ruangan + tahun + semester)
create table if not exists inventaris_kir (
  id text primary key,
  aset_id text references aset(id) on delete cascade,
  ruangan_id text references ruangan(id) on delete cascade,
  tahun_kir integer not null,
  semester_kir text not null,
  jumlah integer not null default 1,
  kondisi text not null default 'Baik',
  keterangan text
);

-- IDENTITAS (satu baris pengaturan identitas kartu, dipakai bersama)
create table if not exists identitas (
  id integer primary key default 1,
  organisasi text,
  provinsi text,
  pengguna_barang text,
  nip_pengguna_barang text,
  pengurus_barang text,
  nip_pengurus_barang text,
  penanggung_jawab text,
  nip_penanggung_jawab text,
  kota text,
  tanggal date
);

insert into identitas (id, organisasi, provinsi, kota)
values (1, 'Dinas Pariwisata Provinsi Sulawesi Tengah', 'Sulawesi Tengah', 'Palu')
on conflict (id) do nothing;

-- -------------------------------------------------------------------------
-- IZINKAN AKSES (Row Level Security)
-- Aplikasi ini memakai login sederhana di sisi browser (bukan Supabase
-- Auth), jadi kita izinkan baca+tulis penuh lewat anon key. Kalau nanti
-- butuh keamanan lebih ketat (login sungguhan per pengguna), aturan ini
-- perlu diganti memakai Supabase Auth.
-- -------------------------------------------------------------------------
alter table ruangan enable row level security;
alter table aset enable row level security;
alter table inventaris_kir enable row level security;
alter table identitas enable row level security;

drop policy if exists "izinkan semua ruangan" on ruangan;
create policy "izinkan semua ruangan" on ruangan for all using (true) with check (true);

drop policy if exists "izinkan semua aset" on aset;
create policy "izinkan semua aset" on aset for all using (true) with check (true);

drop policy if exists "izinkan semua inventaris" on inventaris_kir;
create policy "izinkan semua inventaris" on inventaris_kir for all using (true) with check (true);

drop policy if exists "izinkan semua identitas" on identitas;
create policy "izinkan semua identitas" on identitas for all using (true) with check (true);

-- -------------------------------------------------------------------------
-- DATA CONTOH (sama seperti contoh KIR Ruangan "Lobby Bawah", Semester I 2024)
-- -------------------------------------------------------------------------
insert into ruangan (id, nama, keterangan) values
  ('ruang-lobby-bawah', 'Lobby Bawah', 'Area lobby lantai dasar kantor')
on conflict (id) do nothing;

insert into aset (id, nama_barang, jenis_merek, no_seri, no_register, bahan, tahun_perolehan, kode_barang) values
  ('aset-1', 'Lemari Laci Interior', 'Kayu', '-', '-', 'Kayu', 2019, '-'),
  ('aset-2', 'Lemari Absen Retina', 'Kayu', '-', '-', 'Kayu', 2019, '-'),
  ('aset-3', 'Meja Kerja', 'Kayu', '-', '-', 'Kayu', 1989, '-'),
  ('aset-4', 'Kursi Rapat Merah', '-', '-', '-', '-', 2019, '-'),
  ('aset-5', 'Kursi Merah Panjang', '-', '-', '-', '-', 2014, '-'),
  ('aset-6', 'TV', '-', '-', '-', '-', 2021, '-'),
  ('aset-7', 'TV Monitor CCTV', 'LG', '-', '-', '-', 2017, '-')
on conflict (id) do nothing;

insert into inventaris_kir (id, aset_id, ruangan_id, tahun_kir, semester_kir, jumlah, kondisi, keterangan) values
  ('inv-1', 'aset-1', 'ruang-lobby-bawah', 2024, 'Semester I', 1, 'Baik', 'Koridor Bawah'),
  ('inv-2', 'aset-2', 'ruang-lobby-bawah', 2024, 'Semester I', 2, 'Baik', 'Koridor Bawah'),
  ('inv-3', 'aset-3', 'ruang-lobby-bawah', 2024, 'Semester I', 1, 'Baik', 'Koridor Bawah'),
  ('inv-4', 'aset-4', 'ruang-lobby-bawah', 2024, 'Semester I', 4, 'Baik', 'Koridor Bawah'),
  ('inv-5', 'aset-5', 'ruang-lobby-bawah', 2024, 'Semester I', 1, 'Baik', 'Koridor Bawah'),
  ('inv-6', 'aset-6', 'ruang-lobby-bawah', 2024, 'Semester I', 1, 'Baik', 'Koridor Bawah'),
  ('inv-7', 'aset-7', 'ruang-lobby-bawah', 2024, 'Semester I', 1, 'Baik', 'Koridor Bawah')
on conflict (id) do nothing;
