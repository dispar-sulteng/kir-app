-- =========================================================================
-- Migrasi #3: login sungguhan + peran (admin / staf)
--
--   admin : lihat, cetak, tambah, edit, HAPUS
--   staf  : lihat, cetak, tambah, edit  (TIDAK boleh hapus)
--
-- Jalankan SEKALI di Supabase SQL Editor. Setelah ini, data TIDAK lagi
-- bisa diakses tanpa login (aturan lama "izinkan semua" dicabut).
-- Setelah menjalankan file ini, jalankan juga tambah-pengguna.sql
-- (bagian "jadikan admin") agar akun admin kamu punya peran admin.
-- =========================================================================

-- 1) Tabel profil: satu baris per akun login, menyimpan nama + peran
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text,
  role text not null default 'staf' check (role in ('admin', 'staf'))
);
alter table profiles enable row level security;

-- 2) Fungsi pembantu: peran akun yang sedang login
create or replace function public.peran_saya()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 3) Setiap akun baru otomatis dapat profil dengan peran 'staf'
create or replace function public.buat_profil_baru()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'nama', new.email), 'staf')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.buat_profil_baru();

-- Akun yang SUDAH ada sebelum trigger dibuat: beri profil 'staf' dulu
insert into profiles (id, nama, role)
select id, email, 'staf' from auth.users
on conflict (id) do nothing;

-- 4) Profil: tiap orang hanya bisa membaca profilnya sendiri
--    (tidak ada policy ubah -> peran hanya bisa diubah lewat SQL Editor)
drop policy if exists "baca profil sendiri" on profiles;
create policy "baca profil sendiri" on profiles
  for select to authenticated using (id = auth.uid());

-- 5) Cabut aturan lama yang membuka semua tabel untuk siapa saja
drop policy if exists "izinkan semua ruangan" on ruangan;
drop policy if exists "izinkan semua aset" on aset;
drop policy if exists "izinkan semua inventaris" on inventaris_kir;
drop policy if exists "izinkan semua identitas" on identitas;

-- 6) Aturan baru per tabel
-- ---- ruangan
create policy "baca ruangan" on ruangan
  for select to authenticated using (true);
create policy "tambah ruangan" on ruangan
  for insert to authenticated with check (public.peran_saya() in ('admin', 'staf'));
create policy "ubah ruangan" on ruangan
  for update to authenticated
  using (public.peran_saya() in ('admin', 'staf'))
  with check (public.peran_saya() in ('admin', 'staf'));
create policy "hapus ruangan" on ruangan
  for delete to authenticated using (public.peran_saya() = 'admin');

-- ---- aset
create policy "baca aset" on aset
  for select to authenticated using (true);
create policy "tambah aset" on aset
  for insert to authenticated with check (public.peran_saya() in ('admin', 'staf'));
create policy "ubah aset" on aset
  for update to authenticated
  using (public.peran_saya() in ('admin', 'staf'))
  with check (public.peran_saya() in ('admin', 'staf'));
create policy "hapus aset" on aset
  for delete to authenticated using (public.peran_saya() = 'admin');

-- ---- inventaris_kir
create policy "baca inventaris" on inventaris_kir
  for select to authenticated using (true);
create policy "tambah inventaris" on inventaris_kir
  for insert to authenticated with check (public.peran_saya() in ('admin', 'staf'));
create policy "ubah inventaris" on inventaris_kir
  for update to authenticated
  using (public.peran_saya() in ('admin', 'staf'))
  with check (public.peran_saya() in ('admin', 'staf'));
create policy "hapus inventaris" on inventaris_kir
  for delete to authenticated using (public.peran_saya() = 'admin');

-- ---- identitas (satu baris pengaturan; tidak boleh dihapus siapa pun)
create policy "baca identitas" on identitas
  for select to authenticated using (true);
create policy "tambah identitas" on identitas
  for insert to authenticated with check (public.peran_saya() in ('admin', 'staf'));
create policy "ubah identitas" on identitas
  for update to authenticated
  using (public.peran_saya() in ('admin', 'staf'))
  with check (public.peran_saya() in ('admin', 'staf'));
