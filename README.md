# Panduan Setup

Aplikasi ini: user daftar (email + OTP) → kerjakan tugas → status pending → admin
approve → saldo nambah → user tarik saldo ke DANA → admin proses manual.

## 1. Setup database (Supabase, gratis)

1. Buat akun di https://supabase.com, buat project baru (pilih region Singapore biar cepat).
2. Buka **SQL Editor** di sidebar, klik **New query**, copy-paste seluruh isi file
   `sql/schema.sql` dari project ini, lalu klik **Run**.
3. Buka **Project Settings > Database > Connection string**, pilih mode **Transaction**,
   copy connection string-nya. Ganti `[YOUR-PASSWORD]` dengan password database Anda.
   Ini yang akan diisi ke `DATABASE_URL`.

## 2. Setup email OTP (Resend)

1. Anda sudah punya akun Resend — login ke https://resend.com.
2. **Wajib**: tambahkan & verifikasi domain Anda sendiri di menu **Domains** (misalnya
   `domainanda.com`). Tanpa domain terverifikasi, Anda hanya bisa kirim ke email sendiri,
   dan alamat pengirimnya akan terlihat generic — jadi domain sendiri itu penting supaya
   email tidak "atas nama" pihak lain.
2. Setelah domain terverifikasi, buat API Key di menu **API Keys**. Ini untuk `RESEND_API_KEY`.
3. `EMAIL_FROM` isi dengan alamat di domain Anda, misal `no-reply@domainanda.com`.

Kalau belum punya domain sendiri, beli dulu domain murah (banyak yang di bawah Rp150rb/tahun),
karena tanpa domain terverifikasi pengiriman OTP ke banyak user akan dibatasi/gagal.

## 3. Deploy ke Vercel

1. Push folder project ini ke repository GitHub (bisa lewat GitHub Desktop atau
   upload manual di github.com kalau tidak familiar dengan git).
2. Di https://vercel.com, klik **Add New > Project**, import repo tadi.
3. Sebelum deploy, buka tab **Environment Variables**, isi semua ini (isinya sama
   seperti di file `.env.example`):
   - `DATABASE_URL`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `EMAIL_FROM_NAME` (misal: "Nama Aplikasi Anda")
   - `ADMIN_PASSWORD` (password buat Anda login ke `/admin`)
   - `JWT_SECRET` (isi string acak panjang, minimal 32 karakter — bisa generate di
     https://generate-secret.vercel.app/32)
4. Klik **Deploy**. Tunggu sampai selesai, nanti dapat URL seperti `namaapp.vercel.app`.

## 4. Cara pakai

**Sebagai admin:**
- Buka `namaapp.vercel.app/admin/login`, masuk pakai `ADMIN_PASSWORD` yang Anda set.
- Menu **Tugas**: buat tugas baru (judul, deskripsi, link, imbalan). Tugas baru
  otomatis **nonaktif** — klik "Aktifkan" supaya muncul di dashboard user.
- Menu **Persetujuan Tugas**: ketika user menyelesaikan tugas, muncul di sini
  berstatus menunggu. Klik **Setujui** → saldo user otomatis bertambah sesuai imbalan.
- Menu **Penarikan**: ketika user mengajukan tarik saldo, muncul di sini. Setelah
  Anda transfer manual ke DANA user, klik **Sudah TF, tandai selesai**.
- Menu **Pengguna & Saldo**: cari user, tambah/kurangi saldo manual kapan saja.

**Sebagai user:**
- Daftar di `/register` pakai email → masukkan kode OTP yang dikirim ke email →
  buat username & password.
- Login berikutnya cukup pakai username & password di `/login`.
- Di dashboard, kerjakan tugas yang tersedia, klik "Sudah selesai, kirim" →
  status jadi menunggu sampai admin setujui.
- Tarik saldo kapan saja tanpa minimum, isi nomor DANA.

## Catatan penting

- Nomor DANA dan saldo yang diajukan penarikan **tidak divalidasi ke sistem DANA
  asli** — ini murni pencatatan manual, sesuai permintaan Anda (Anda yang transfer
  manual lalu klik selesai di panel).
- Password user di-hash (bcrypt), tidak disimpan mentah.
- Kode OTP berlaku 10 menit dan cuma bisa dipakai sekali.
- Kalau ada error saat deploy terkait database, cek lagi `DATABASE_URL` — pastikan
  passwordnya sudah diganti dari `[YOUR-PASSWORD]` ke password asli Supabase Anda.
