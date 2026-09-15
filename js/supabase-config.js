/* =========================================================================
   supabase-config.js
   GANTI dua nilai di bawah ini dengan milik project Supabase kamu sendiri.
   Ambil dari: Dashboard Supabase -> Project Settings -> API.

   "anon public" key ini AMAN ditaruh di kode frontend (memang didesain
   untuk itu oleh Supabase) — keamanan diatur lewat Row Level Security
   policy di database, bukan dengan menyembunyikan key ini.
   ========================================================================= */

const SUPABASE_URL = "https://peyyootevwqydlwfxzic.supabase.co/rest/v1/"; // contoh: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleXlvb3RldndxeWRsd2Z4emljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMzQzMDksImV4cCI6MjEwNDkxMDMwOX0.YZD7iX3oqYpH6Hnki9_z1U6_7Bh7rnjfWx93uexuGEs";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
