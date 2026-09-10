# Booru API

ElysiaJS + Bun API untuk aplikasi berbagi gambar. Frontend sederhana tersedia di `http://localhost:3000`.

## 1. Prasyarat

Install:

- [Bun](https://bun.sh/)
- Akun [Supabase](https://supabase.com/)

Periksa instalasi:

```bash
bun --version
```

## 2. Install dan jalankan mode lokal

Di folder proyek:

```bash
bun install
bun run dev
```

Buka `http://localhost:3000`. Tanpa konfigurasi Supabase, API tetap dapat dijalankan dengan penyimpanan sementara di memory. Data akan hilang ketika server berhenti.

## 3. Buat project Supabase

1. Buka dashboard Supabase dan pilih **New project**.
2. Isi nama project dan password database.
3. Tunggu sampai project selesai dibuat.
4. Buka **Project Settings > API**.
5. Salin:
	 - **Project URL**
	 - **anon public key**
	 - **service_role secret key**

`service_role` hanya boleh digunakan oleh backend. Jangan masukkan key ini ke `public/index.html`, frontend React/Next.js, Git, atau chat publik.

## 4. Buat tabel dan bucket Supabase

1. Di Supabase buka **SQL Editor**.
2. Buat query baru.
3. Salin seluruh isi file [`supabase.sql`](supabase.sql).
4. Jalankan query dengan **Run**.

Query tersebut membuat:

- tabel `public.images`
- kolom tags bertipe array
- index pencarian tags
- bucket Storage publik bernama `images`
- bucket Storage publik bernama `server` untuk background website

Bucket dibuat publik agar URL gambar dapat ditampilkan langsung di gallery. Metadata tetap disimpan di tabel PostgreSQL, sedangkan file binary disimpan di Storage.

## Background website

Background tidak memakai gambar upload terbaru. Background diambil dari bucket Storage `server`.

1. Jalankan bagian bucket `server` dari [`supabase.sql`](supabase.sql), atau buat bucket public bernama `server` di **Storage > New bucket**.
2. Upload file background ke bucket `server`, misalnya `background.jpg`.
3. Tambahkan ke `.env`:

```env
SUPABASE_BACKGROUND_BUCKET=server
SUPABASE_BACKGROUND_PATH=background.jpg
```

Path dapat berupa folder, misalnya `presets/home.jpg`. File harus public agar dapat ditampilkan browser.

Untuk background animasi MP4, upload file ke bucket `server`, misalnya `background.mp4`, lalu isi:

```env
SUPABASE_BACKGROUND_VIDEO_PATH=background.mp4
```

Video memiliki prioritas di atas gambar. Background video berjalan `autoplay`, `muted`, `loop`, dan `playsinline` agar didukung browser. Kosongkan variable tersebut untuk kembali memakai `background.jpg`.

## Custom browser icon

Upload an image such as `favicon.png` to the public `server` bucket. Add:

```env
SUPABASE_FAVICON_PATH=favicon.png
```

The browser tab will use that image after restarting the server and refreshing with `Ctrl + F5`.

## 5. Konfigurasi file `.env`

Buat file `.env` dari template:

```powershell
Copy-Item .env.example .env
```

Isi `.env` dengan nilai project Supabase asli:

```env
PORT=3000
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_STORAGE_BUCKET=images
```

Jangan biarkan nilai berikut tetap ada:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Setelah mengubah `.env`, hentikan dan jalankan ulang server:

```bash
bun run dev
```

## 6. Buat akun user

Untuk membuat akun:

1. Buka `http://localhost:3000`.
2. Gunakan panel **Login / Register** di kiri atas halaman.
3. Pilih **Register**, masukkan email dan password, lalu konfirmasi email jika pengaturan **Confirm email** aktif.
4. Setelah itu pilih **Login**.
5. Alternatifnya, user dapat dibuat dari **Authentication > Users > Add user** di dashboard Supabase.

Token akses Supabase didapat setelah user login melalui Supabase Auth. Token ini dikirim ke API sebagai:

```http
Authorization: Bearer <access-token>
```

## 7. Jadikan user sebagai admin

API menganggap user sebagai admin jika salah satu metadata berikut bernilai `admin`:

- `app_metadata.role`
- `user_metadata.role`

Untuk testing cepat, buka user di **Authentication > Users**, pilih menu metadata, lalu isi:

```json
{
	"role": "admin"
}
```

Untuk production, gunakan `app_metadata`, bukan `user_metadata`, karena user tidak boleh dapat mengubah role miliknya sendiri. Perubahan role biasanya dilakukan melalui Supabase Admin API di backend menggunakan `SUPABASE_SERVICE_ROLE_KEY`.

## 8. Jalankan dan tes halaman web

```bash
bun run dev
```

Buka:

```text
http://localhost:3000
```

Halaman demo dapat:

- register, login, dan logout
- melihat gallery
- mencari gambar berdasarkan tag
- memilih file gambar
- mengirim tags dengan format `cat, animal, night`
- mengirim upload ke `POST /images`

Setelah login, access token disimpan di browser dan otomatis digunakan untuk upload. Jangan masukkan `service_role key` ke browser.

## 9. Tes API dengan PowerShell

Cek server:

```powershell
Invoke-RestMethod http://localhost:3000/
```

Ambil semua gambar:

```powershell
Invoke-RestMethod http://localhost:3000/images
```

Cari tag:

```powershell
Invoke-RestMethod "http://localhost:3000/search?tag=cat"
```

Ambil semua tags:

```powershell
Invoke-RestMethod http://localhost:3000/tags
```

Upload dengan access token dan `curl.exe`:

```powershell
$token = "SUPABASE_ACCESS_TOKEN"
curl.exe -X POST http://localhost:3000/images `
	-H "Authorization: Bearer $token" `
	-F "image=@.\sample.jpg" `
	-F "tags=cat, animal"
```

Untuk contoh edit dan delete, buat header token setelahnya:

```powershell
$headers = @{ Authorization = "Bearer $token" }
```

Edit gambar milik user:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/images/IMAGE_ID -Method Patch -Headers $headers -ContentType "application/json" -Body '{"tags":["cat","night"]}'
```

Hapus gambar milik user:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/images/IMAGE_ID -Method Delete -Headers $headers
```

## 10. Endpoint

Public:

- `GET /images`
- `GET /images/:id`
- `GET /search?tag=cat`
- `GET /tags`

Authenticated:

- `POST /images` multipart form: `image`, optional `tags`
- `PATCH /images/:id` JSON: `filename`, `tags`
- `DELETE /images/:id`

User biasa hanya dapat mengubah atau menghapus gambar miliknya. Admin dapat mengubah atau menghapus semua gambar. Request tanpa token menghasilkan `401`, sedangkan user yang bukan pemilik menghasilkan `403`.

## 11. Troubleshooting

**`/images` mengembalikan error Supabase**

- Pastikan `SUPABASE_URL` benar.
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` benar dan tidak terpotong.
- Pastikan query [`supabase.sql`](supabase.sql) sudah dijalankan.
- Restart `bun run dev` setelah mengubah `.env`.

**Upload menghasilkan `401 Unauthorized`**

- Gunakan access token hasil login, bukan anon key.
- Pastikan header persis `Authorization: Bearer <token>`.
- Jangan gunakan service-role key sebagai token user.

**Upload menghasilkan `403 Forbidden` saat edit/delete**

- User tersebut bukan pemilik gambar.
- Atau set role user menjadi `admin` sesuai langkah di atas.

**Gambar tidak tampil**

- Pastikan bucket `images` bersifat public.
- Pastikan kolom `url` berisi public URL Storage.
- Pastikan file benar-benar bertipe image.