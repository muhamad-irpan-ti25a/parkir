# 🅿️ Simulasi Parkir
### Web-Based Parking Management & Simulation System

Aplikasi simulasi manajemen parkir berbasis web yang dirancang untuk mengelola aktivitas kendaraan masuk dan keluar, pemantauan ketersediaan slot parkir, pengelolaan tiket digital, serta perhitungan biaya parkir secara otomatis.

Sistem ini memiliki tiga antarmuka utama, yaitu Gerbang Masuk, Gerbang Keluar, dan Dashboard Admin. Aplikasi dibangun menggunakan Node.js, Express.js, dan SQLite dengan tampilan responsif serta dukungan QR Code.

---

## 📌 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Fitur Utama](#-fitur-utama)
- [Teknologi](#-teknologi-yang-digunakan)
- [Struktur Folder](#-struktur-folder)
- [Persyaratan Sistem](#-persyaratan-sistem)
- [Instalasi](#-instalasi-dan-konfigurasi)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [Halaman Aplikasi](#-halaman-aplikasi)
- [Sistem Tarif Parkir](#-sistem-tarif-parkir)
- [API Endpoints](#-api-endpoints)
- [Database](#-struktur-database)
- [Mode Kiosk](#-mode-kiosk)
- [Pengembangan](#-pengembangan)
- [Lisensi](#-lisensi)

---

## 📖 Tentang Proyek

Simulasi Parkir merupakan aplikasi berbasis web yang digunakan untuk mensimulasikan proses operasional sistem parkir secara digital.

Aplikasi ini memungkinkan pengguna mengambil tiket parkir berdasarkan jenis kendaraan, mendapatkan QR Code sebagai identitas tiket, serta melakukan proses keluar dengan memindai QR Code atau memasukkan kode tiket secara manual.

Administrator dapat memantau kondisi area parkir secara real-time, mengelola slot kendaraan, mengatur tarif, serta melihat dan mengelola riwayat transaksi parkir.

### Tujuan Pengembangan

1. Mengimplementasikan sistem pengelolaan parkir berbasis web.
2. Mempermudah proses pencatatan kendaraan masuk dan keluar.
3. Menggunakan QR Code sebagai identitas tiket parkir digital.
4. Memantau ketersediaan slot parkir secara otomatis.
5. Mengimplementasikan perhitungan tarif berdasarkan durasi parkir.
6. Menyediakan dashboard administrasi untuk pengelolaan parkir.

---

## ✨ Fitur Utama

### 1. Gerbang Masuk

- Pemilihan kategori kendaraan Motor dan Mobil.
- Menampilkan jumlah slot kosong dan terisi.
- Pengambilan tiket parkir secara otomatis.
- Input plat nomor kendaraan (opsional).
- Pembuatan kode tiket unik.
- Pembuatan QR Code tiket digital.
- Penentuan slot parkir secara otomatis.
- Menampilkan nomor slot parkir.
- Tiket digital dapat dibuka melalui HP.
- Unduh tiket dalam format PNG.
- Cetak tiket menggunakan printer thermal.
- Pengaturan jeda otomatis untuk kendaraan berikutnya.

### 2. Gerbang Keluar

- Pemindaian QR Code menggunakan kamera.
- Input kode tiket secara manual.
- Validasi kode tiket ke database.
- Menampilkan detail tiket sebelum konfirmasi keluar.
- Menampilkan durasi parkir.
- Menghitung estimasi biaya parkir.
- Konfirmasi proses keluar kendaraan.
- Mengubah status tiket menjadi selesai.
- Mengosongkan slot parkir secara otomatis.
- Menampilkan bukti transaksi keluar.
- Kembali ke halaman scan secara otomatis.

### 3. Dashboard Admin

**Ringkasan Parkir**
- Total slot parkir.
- Jumlah slot kosong.
- Jumlah slot terisi.
- Pembaruan data otomatis setiap 10 detik.

**Peta Slot Parkir**
- Menampilkan seluruh slot parkir.
- Filter berdasarkan jenis kendaraan.
- Indikator slot kosong dan terisi.
- Menampilkan plat nomor kendaraan.
- Mengubah kode slot.
- Menghapus slot yang kosong.
- Mencegah penghapusan slot yang sedang terisi.

**Pengaturan Tarif**
- Mengatur tarif jam pertama.
- Mengatur tarif setiap jam berikutnya.
- Menyimpan konfigurasi tarif ke database.

**Manajemen Slot**
- Menambahkan satu slot parkir.
- Menambahkan slot menggunakan rentang kode.
- Mendukung pembuatan maksimal 300 slot sekali proses.
- Validasi format kode slot.
- Mencegah duplikasi kode slot.

**Manajemen Tiket**
- Menampilkan maksimal 100 tiket terbaru.
- Pencarian berdasarkan kode tiket.
- Pencarian berdasarkan plat nomor.
- Pencarian berdasarkan kode slot.
- Filter status tiket aktif dan selesai.
- Filter berdasarkan tempat atau blok parkir.
- Membuka tiket digital.
- Menghapus tiket individual.
- Menghapus seluruh tiket yang sudah selesai.

---

## 🛠️ Teknologi yang Digunakan

| Teknologi | Kegunaan |
|---|---|
| HTML5 | Struktur halaman aplikasi |
| CSS3 | Desain dan tampilan responsif |
| JavaScript | Interaksi dan logika frontend |
| Node.js | Runtime JavaScript server |
| Express.js | Framework backend dan REST API |
| SQLite | Database penyimpanan |
| better-sqlite3 | Koneksi dan pengelolaan database |
| QRCode | Pembuatan QR Code |
| html5-qrcode | Pemindaian QR Code melalui kamera |
| @napi-rs/canvas | Pembuatan gambar tiket PNG |

---

## 📁 Struktur Folder

```text
parkir-sim/
│
├── css/
│   └── style.css
│
├── data/
│   └── parkir.db
│
├── public/
│   ├── masuk.html
│   ├── keluar.html
│   ├── admin.html
│   │
│   └── img/
│       └── logo.png
│
├── routes/
│   └── api.js
│
├── db.js
├── server.js
│
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

**Keterangan:**

- `css/` : Menyimpan stylesheet aplikasi.
- `data/` : Menyimpan database SQLite.
- `public/` : Menyimpan halaman HTML dan aset frontend.
- `routes/` : Menyimpan konfigurasi endpoint API.
- `db.js` : Inisialisasi database, tabel, konfigurasi tarif, dan slot awal.
- `server.js` : Konfigurasi server Express dan halaman aplikasi.
- `package.json` : Informasi proyek dan dependensi Node.js.
- `README.md` : Dokumentasi proyek.

---

## 💻 Persyaratan Sistem

Pastikan perangkat sudah memiliki:

- Node.js versi 18 atau lebih baru.
- NPM.
- Browser modern seperti Google Chrome atau Microsoft Edge.
- Sistem operasi Windows, Linux, atau macOS.
- Koneksi internet untuk memuat library QR scanner dari CDN.

---

## ⚙️ Instalasi dan Konfigurasi

### 1. Clone Repository

```bash
git clone https://github.com/muhamad-irpan-ti25a/parkir.git
```

### 2. Masuk ke Direktori Proyek

```bash
cd parkir
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Jalankan Aplikasi

```bash
npm start
```

Jika belum tersedia script `start` di `package.json`, jalankan:

```bash
node server.js
```

### 5. Buka Aplikasi

Setelah server berjalan, buka browser dan akses:

| Halaman | URL |
|---|---|
| Gerbang Masuk | http://localhost:3000/masuk |
| Gerbang Keluar | http://localhost:3000/keluar |
| Dashboard Admin | http://localhost:3000/admin |

---

## 🚀 Menjalankan Aplikasi

Setelah server aktif, aplikasi dapat digunakan melalui tiga halaman utama.

**Alur penggunaan:**

1. Pengguna memilih jenis kendaraan.
2. Sistem memeriksa ketersediaan slot.
3. Pengguna mengambil tiket parkir.
4. Sistem menentukan slot dan membuat QR Code.
5. Kendaraan menempati slot yang telah ditentukan.
6. Saat keluar, pengguna memindai QR Code.
7. Sistem memvalidasi tiket dan menghitung biaya.
8. Pengguna mengonfirmasi proses keluar.
9. Sistem menyelesaikan transaksi dan mengosongkan slot.

---

## 🖥️ Halaman Aplikasi

### Gerbang Masuk

Digunakan untuk proses registrasi kendaraan yang memasuki area parkir.

### Gerbang Keluar

Digunakan untuk memvalidasi tiket, menghitung biaya, dan menyelesaikan transaksi parkir.

### Dashboard Admin

Digunakan untuk memantau aktivitas parkir serta mengelola slot, tarif, dan data tiket.

---

## 💰 Sistem Tarif Parkir

Aplikasi menggunakan sistem perhitungan tarif berdasarkan durasi parkir.

Konfigurasi tarif awal:

| Komponen | Tarif |
|---|---:|
| Jam pertama | Rp3.000 |
| Setiap jam berikutnya | Rp2.000 |

Durasi parkir dibulatkan ke atas per jam.

Contoh simulasi:

| Durasi | Biaya |
|---|---:|
| 30 menit | Rp3.000 |
| 1 jam | Rp3.000 |
| 1 jam 30 menit | Rp5.000 |
| 2 jam | Rp5.000 |
| 2 jam 30 menit | Rp7.000 |
| 3 jam | Rp7.000 |

Tarif dapat diubah melalui Dashboard Admin dan tersimpan di database.

---

## 🔌 API Endpoints

Berikut daftar endpoint yang digunakan oleh aplikasi berdasarkan integrasi frontend.

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/status` | Mengambil status parkir |
| POST | `/api/tiket` | Membuat tiket parkir |
| GET | `/api/tiket/:kode` | Mengambil detail tiket |
| POST | `/api/keluar` | Memproses kendaraan keluar |
| GET | `/api/admin/slots` | Mengambil daftar slot |
| POST | `/api/admin/slots` | Menambahkan slot |
| PUT | `/api/admin/slots/:id` | Mengubah kode slot |
| DELETE | `/api/admin/slots/:id` | Menghapus slot |
| GET | `/api/admin/tiket` | Mengambil daftar tiket |
| DELETE | `/api/admin/tiket/:kode` | Menghapus tiket |
| DELETE | `/api/admin/tiket` | Menghapus tiket selesai |
| GET | `/api/admin/settings` | Mengambil pengaturan tarif |
| PUT | `/api/admin/settings` | Memperbarui tarif |

Endpoint gambar tiket:

```text
GET /t/:kode/gambar.png
```

Endpoint tiket digital:

```text
GET /t/:kode
```

---

## 🗄️ Struktur Database

Aplikasi menggunakan SQLite dengan tiga tabel utama.

### 1. Tabel `slots`

Menyimpan informasi slot parkir.

| Kolom | Tipe Data | Keterangan |
|---|---|---|
| id | INTEGER | Primary Key |
| kode | TEXT | Kode slot unik |
| kategori | TEXT | Motor atau Mobil |
| status | TEXT | Kosong atau Terisi |

### 2. Tabel `tickets`

Menyimpan data tiket parkir.

| Kolom | Tipe Data | Keterangan |
|---|---|---|
| id | INTEGER | Primary Key |
| kode | TEXT | Kode tiket unik |
| slot_id | INTEGER | Foreign Key ke slots |
| plat | TEXT | Plat kendaraan |
| waktu_masuk | TEXT | Waktu masuk |
| waktu_keluar | TEXT | Waktu keluar |
| biaya | INTEGER | Total biaya |
| status | TEXT | Aktif atau Selesai |

### 3. Tabel `settings`

Menyimpan konfigurasi aplikasi.

| Kolom | Tipe Data | Keterangan |
|---|---|---|
| key | TEXT | Primary Key |
| value | TEXT | Nilai konfigurasi |

Database dibuat secara otomatis ketika aplikasi pertama kali dijalankan.

**Data awal slot:**

- Motor: 105 slot (A001–G015).
- Mobil: 45 slot (H001–J015).
- Total: 150 slot.

---

## 🖨️ Mode Kiosk

Aplikasi mendukung mode kiosk untuk penggunaan pada komputer atau perangkat khusus di gerbang parkir.

### Mode Kiosk Masuk

```text
http://localhost:3000/masuk?kiosk=1
```

Fungsi:
- Menyembunyikan navigasi.
- Menyembunyikan input plat nomor.
- Mempermudah pengoperasian melalui layar sentuh.

### Mode Cetak Otomatis

```text
http://localhost:3000/masuk?kiosk=1&cetak=1
```

Fungsi:
- Mengaktifkan ukuran kertas printer thermal 80 mm.
- Memanggil fungsi cetak otomatis setelah tiket dibuat.

Untuk pencetakan tanpa dialog, browser harus dijalankan dengan konfigurasi kiosk printing yang sesuai.

---

## 🔧 Pengembangan

Untuk menjalankan server dalam mode pengembangan, kamu dapat menggunakan:

```bash
node server.js
```

Setelah mengubah kode, mulai ulang server jika belum menggunakan tool auto-restart.

### Catatan Pengembangan

- Database menggunakan SQLite lokal.
- Folder `data/` menyimpan database aplikasi.
- File `parkir.db` sebaiknya tidak dihapus ketika aplikasi sedang digunakan.
- Pastikan backup database dilakukan secara berkala.
- Gunakan koneksi HTTPS ketika aplikasi diakses melalui jaringan produksi.
- Fitur autentikasi admin perlu ditambahkan sebelum aplikasi digunakan dalam lingkungan produksi.

---

## 📄 Lisensi

Proyek ini dikembangkan sebagai aplikasi simulasi dan pembelajaran dalam bidang pengembangan aplikasi web, khususnya sistem manajemen parkir.

Hak penggunaan dan pengembangan mengikuti ketentuan pemilik repository.

---

**Developed by Muhammad Irpan**

GitHub: [@muhamad-irpan-ti25a](https://github.com/muhamad-irpan-ti25a)

Repository: [parkir](https://github.com/muhamad-irpan-ti25a/parkir)
