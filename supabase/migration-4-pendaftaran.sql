-- =========================================================================
-- Migrasi #4: pendaftaran mandiri + persetujuan admin
--
-- Alur: staf daftar sendiri di halaman login -> akun berstatus MENUNGGU
-- (belum bisa melihat data apa pun) -> admin menyetujui lewat halaman
-- "Kelola Pengguna" -> akun menjadi AKTIF.
--
-- Prasyarat: migration-3-auth-roles.sql sudah dijalankan.
-- Aman dijalankan ulang (tidak mengaktifkan akun yang masih menunggu).
-- =========================================================================

-- 1) Kolom baru: status aktif + email (untuk ditampilkan di Kelola Pengguna)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'aktif'
  ) then
    alter table profiles add column aktif boolean not null default false;
    -- akun yang sudah ada sebelum migrasi ini langsung dianggap aktif
    update profiles set aktif = true;
  end if;
end $$;

alter table profiles add column if not exists email text;
update profiles p set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- 2) Peran hanya berlaku untuk akun AKTIF -> akun menunggu otomatis
--    ditolak oleh semua aturan akses yang memakai peran_saya()
create or replace function public.peran_saya()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid() and aktif = true;
$$;

-- 3) Akun baru (daftar mandiri maupun dibuat lewat dashboard) berstatus
--    MENUNGGU dengan peran 'staf' sampai disetujui admin
create or replace function public.buat_profil_baru()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama, email, role, aktif)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nama', ''), new.email),
    new.email,
    'staf',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4) Membaca data kini juga mensyaratkan akun AKTIF
drop policy if exists "baca ruangan" on ruangan;
create policy "baca ruangan" on ruangan
  for select to authenticated using (public.peran_saya() is not null);

drop policy if exists "baca aset" on aset;
create policy "baca aset" on aset
  for select to authenticated using (public.peran_saya() is not null);

drop policy if exists "baca inventaris" on inventaris_kir;
create policy "baca inventaris" on inventaris_kir
  for select to authenticated using (public.peran_saya() is not null);

drop policy if exists "baca identitas" on identitas;
create policy "baca identitas" on identitas
  for select to authenticated using (public.peran_saya() is not null);

-- 5) Admin boleh melihat semua profil dan mengubah peran/status
--    ("baca profil sendiri" dari migrasi #3 tetap berlaku, supaya akun
--    yang menunggu bisa tahu statusnya)
drop policy if exists "admin baca semua profil" on profiles;
create policy "admin baca semua profil" on profiles
  for select to authenticated using (public.peran_saya() = 'admin');

drop policy if exists "admin ubah profil" on profiles;
create policy "admin ubah profil" on profiles
  for update to authenticated
  using (public.peran_saya() = 'admin')
  with check (public.peran_saya() = 'admin');
