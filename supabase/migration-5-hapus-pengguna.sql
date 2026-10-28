-- =========================================================================
-- Migrasi #5: hapus akun pengguna dari halaman "Kelola Pengguna"
--
-- Menghapus akun login secara PERMANEN (baris di auth.users; profilnya ikut
-- terhapus otomatis karena relasi "on delete cascade"). Data inventaris yang
-- pernah diinput orang itu TIDAK terhapus (tabel inventaris tidak
-- menyimpan siapa penginputnya).
--
-- Prasyarat: migration-3 dan migration-4 sudah dijalankan.
-- Aman dijalankan ulang.
-- =========================================================================

create or replace function public.hapus_pengguna(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Hanya admin yang aktif
  if public.peran_saya() is distinct from 'admin' then
    raise exception 'Hanya admin yang boleh menghapus pengguna.' using errcode = '42501';
  end if;

  -- Admin tidak boleh menghapus akunnya sendiri (supaya tidak terkunci keluar)
  if target_id = auth.uid() then
    raise exception 'Tidak bisa menghapus akun sendiri.' using errcode = '22023';
  end if;

  delete from auth.users where id = target_id;

  if not found then
    raise exception 'Pengguna tidak ditemukan.' using errcode = 'P0002';
  end if;
end;
$$;

-- Fungsi ini hanya boleh dipanggil oleh akun yang sudah login (dan di dalamnya
-- tetap dicek harus admin). Orang yang belum login tidak bisa memanggilnya.
revoke all on function public.hapus_pengguna(uuid) from public, anon, authenticated;
grant execute on function public.hapus_pengguna(uuid) to authenticated;
