const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Folder penyimpanan file database
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'parkir.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- Skema tabel ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS slots (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    kode      TEXT NOT NULL UNIQUE,                 -- contoh: A001
    kategori  TEXT NOT NULL DEFAULT 'motor',        -- 'motor' | 'mobil'
    status    TEXT NOT NULL DEFAULT 'kosong'        -- 'kosong' | 'terisi'
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    kode          TEXT NOT NULL UNIQUE,             -- isi QR code
    slot_id       INTEGER NOT NULL REFERENCES slots(id),
    plat          TEXT,                             -- boleh kosong
    waktu_masuk   TEXT NOT NULL,                    -- ISO string
    waktu_keluar  TEXT,
    biaya         INTEGER,
    status        TEXT NOT NULL DEFAULT 'aktif'     -- 'aktif' | 'selesai'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );
`);

// Migrasi: database lama belum punya kolom kategori
const kolomSlot = db.prepare('PRAGMA table_info(slots)').all().map((k) => k.name);
if (!kolomSlot.includes('kategori')) {
  db.exec("ALTER TABLE slots ADD COLUMN kategori TEXT NOT NULL DEFAULT 'motor'");
}

// ---------- Data awal ----------
const defaultSettings = {
  tarif_jam_pertama: '3000',
  tarif_per_jam: '2000',
};

const insertSetting = db.prepare(
  'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
);
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}

// Slot awal, hanya dibuat kalau tabel masih kosong.
// Slot lain bisa ditambah dari halaman admin (misal C001-C015).
const BLOK_AWAL = [
  { kategori: 'motor', huruf: 'ABCDEFG', jumlah: 15 }, // A001-G015 (105 slot)
  { kategori: 'mobil', huruf: 'HIJ',     jumlah: 15 }, // H001-J015 (45 slot)
];

const jumlahSlot = db.prepare('SELECT COUNT(*) AS n FROM slots').get().n;
if (jumlahSlot === 0) {
  const insertSlot = db.prepare('INSERT INTO slots (kode, kategori) VALUES (?, ?)');
  const seed = db.transaction(() => {
    for (const blok of BLOK_AWAL) {
      for (const huruf of blok.huruf) {
        for (let i = 1; i <= blok.jumlah; i++) {
          insertSlot.run(huruf + String(i).padStart(3, '0'), blok.kategori);
        }
      }
    }
  });
  seed();
}

// ---------- Helper ----------
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ' +
    'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

module.exports = { db, getSetting, setSetting };