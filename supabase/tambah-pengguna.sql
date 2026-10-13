-- =========================================================================
-- Kumpulan perintah SQL untuk mengelola pengguna. Jalankan satu per satu
-- di Supabase SQL Editor (ganti email/nama sesuai kebutuhan).
-- Staf biasanya mendaftar sendiri di halaman login lalu disetujui admin di
-- menu "Kelola Pengguna". Akun yang dibuat lewat Authentication -> Users ->
-- Add user juga berstatus MENUNGGU sampai disetujui di menu yang sama.
-- =========================================================================

-- A) JADIKAN ADMIN (wajib dilakukan sekali untuk akun admin pertama)
--    Ganti email di bawah dengan email akun admin yang sudah kamu buat.
--    (jalankan setelah migration-4-pendaftaran.sql)
insert into profiles (id, nama, email, role, aktif)
select id, 'Administrator', email, 'admin', true from auth.users
where email = 'dianw185@gmail.com'
on conflict (id) do update set role = 'admin', aktif = true, nama = 'Administrator';

-- B) UBAH NAMA TAMPIL untuk seorang staf (akun baru otomatis berperan 'staf')
update profiles set nama = 'Nama Staf'
where id = (select id from auth.users where email = 'GANTI_EMAIL_STAF@contoh.com');

-- C) NAIKKAN staf menjadi admin / TURUNKAN admin menjadi staf
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'GANTI_EMAIL@contoh.com');

update profiles set role = 'staf'
where id = (select id from auth.users where email = 'GANTI_EMAIL@contoh.com');

-- D) LIHAT DAFTAR PENGGUNA DAN PERANNYA
select u.email, p.nama, p.role
from auth.users u left join profiles p on p.id = u.id
order by p.role, u.email;
