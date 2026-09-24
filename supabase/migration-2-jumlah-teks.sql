-- =========================================================================
-- Migrasi #2: kolom "jumlah" dari angka (integer) menjadi teks
-- Jalankan skrip ini SEKALI di Supabase SQL Editor kalau database kamu
-- sudah pernah dibuat sebelumnya lewat schema.sql versi lama (kolom jumlah
-- bertipe integer). Data yang sudah ada TIDAK akan hilang — angka yang
-- sudah tersimpan otomatis diubah jadi teks (misal 2 menjadi "2").
--
-- Kalau kamu baru pertama kali membuat database (belum pernah menjalankan
-- schema.sql versi lama), TIDAK PERLU menjalankan file ini — cukup jalankan
-- schema.sql yang sudah diperbarui.
-- =========================================================================

alter table inventaris_kir alter column jumlah drop default;
alter table inventaris_kir alter column jumlah type text using jumlah::text;
alter table inventaris_kir alter column jumlah set default '1';
