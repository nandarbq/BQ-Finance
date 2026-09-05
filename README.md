# AresKu

Aplikasi pencatatan keuangan pribadi & keluarga. Input cepat (nominal + kategori saja yang wajib), mode Pribadi dan Keluarga terpisah, grafik pengeluaran, dan multi-pengguna lewat login Supabase.

## 1. Siapkan database (Supabase)

1. Buat akun gratis di [supabase.com](https://supabase.com) lalu buat **New project**.
2. Buka menu **SQL Editor** di dashboard project, tempel seluruh isi file `supabase/schema.sql`, lalu klik **Run**. Ini akan membuat tabel `members`, `transactions`, dan aturan keamanan (Row Level Security) supaya data tiap pengguna terpisah otomatis.
3. Buka **Project Settings > API**, salin nilai **Project URL** dan **anon public key**.
4. (Opsional tapi disarankan) Di menu **Authentication > Providers**, pastikan **Email** aktif. Kalau tidak mau ada verifikasi email saat testing, matikan "Confirm email" di **Authentication > Settings**.

## 2. Jalankan di komputer

```bash
# 1. install dependency
npm install

# 2. salin env & isi dengan URL + anon key dari Supabase
cp .env.example .env
# lalu edit .env

# 3. jalankan mode development
npm run dev
```

Buka `http://localhost:5173`, daftar akun baru, dan mulai coba catat transaksi.

## 3. Deploy ke internet (gratis)

**Opsi tercepat: Vercel**

1. Push folder ini ke repository GitHub.
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repo tadi.
3. Saat diminta Environment Variables, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dengan nilai yang sama dari `.env`.
4. Klik **Deploy**. Beres — dapat URL `https://nama-project.vercel.app` yang bisa dibuka dan di-*install* dari HP mana pun (tombol "Add to Home Screen" / "Install app").

Netlify dan Cloudflare Pages juga bisa dipakai dengan cara serupa (hubungkan repo, isi env var yang sama, build command `npm run build`, output folder `dist`).

## 4. Ganti ikon (opsional)

Saya sudah sertakan ikon sementara di `public/icons/`. Kalau mau ikon custom, ganti `icon-192.png` dan `icon-512.png` dengan desain sendiri (ukuran persis 192x192 dan 512x512 piksel, format PNG).

## 5. Kalau ingin jadi aplikasi native (Play Store / App Store)

Setelah versi web ini jalan dan sudah di-deploy, folder ini bisa dibungkus dengan [Capacitor](https://capacitorjs.com) tanpa menulis ulang UI:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init AresKu com.namakamu.aresku
npm run build
npx cap add android
npx cap add ios
npx cap open android   # atau: npx cap open ios
```

Dari situ tinggal build APK/IPA lewat Android Studio / Xcode dan submit ke Play Console / App Store Connect.

## Struktur proyek

```
src/
  lib/
    supabaseClient.js   # koneksi ke Supabase
    financeApi.js        # semua query database (transaksi & anggota)
  components/
    AuthGate.jsx          # halaman login/daftar
    AresKuApp.jsx          # aplikasi utama (beranda, transaksi, grafik, pengaturan)
  App.jsx
  main.jsx
supabase/
  schema.sql               # skema tabel + keamanan (RLS)
public/
  manifest.json             # metadata PWA (nama, ikon, warna)
  sw.js                       # service worker minimal
```
