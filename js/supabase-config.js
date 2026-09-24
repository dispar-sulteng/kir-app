/* =========================================================================
   supabase-config.js
   GANTI dua nilai di bawah ini dengan milik project Supabase kamu sendiri.
   Ambil dari: Dashboard Supabase -> Project Settings -> API.

   "anon public" key ini AMAN ditaruh di kode frontend (memang didesain
   untuk itu oleh Supabase) — keamanan diatur lewat Row Level Security
   policy di database, bukan dengan menyembunyikan key ini.
   ========================================================================= */

const SUPABASE_URL = "GANTI_DENGAN_PROJECT_URL_KAMU"; // contoh: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = "GANTI_DENGAN_ANON_KEY_KAMU";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
