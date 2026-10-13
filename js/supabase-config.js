/* =========================================================================
   supabase-config.js
   Project URL + anon key milik project Supabase kamu.
   Ambil dari: Dashboard Supabase -> Project Settings -> API.

   "anon public" key ini AMAN ditaruh di kode frontend (memang didesain
   untuk itu oleh Supabase). Keamanan data diatur lewat login (Supabase
   Auth) dan Row Level Security di database — lihat
   supabase/migration-3-auth-roles.sql.
   ========================================================================= */

const SUPABASE_URL = "https://peyyootevwqydlwfxzic.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleXlvb3RldndxeWRsd2Z4emljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMzQzMDksImV4cCI6MjEwNDkxMDMwOX0.YZD7iX3oqYpH6Hnki9_z1U6_7Bh7rnjfWx93uexuGEs";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
