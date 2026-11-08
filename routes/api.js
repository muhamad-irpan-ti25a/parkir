const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const os = require('os');
const { db, getSetting, setSetting } = require('../db');

const router = express.Router();
const PORT = process.env.PORT || 3000;
const KATEGORI = ['motor', 'mobil'];

// ---------- Alamat yang bisa dibuka dari HP ----------
// Adapter virtual yang dilewati (VirtualBox, VMware, Hyper-V, WSL, VPN)
const ADAPTER_VIRTUAL = /virtual|vmware|vbox|hyper-v|vethernet|wsl|docker|loopback|vpn|tap|tun/i;

// Cari IP laptop di jaringan WiFi/LAN yang sebenarnya
function ipLokal() {
  const kandidat = [];
  for (const [nama, list] of Object.entries(os.networkInterfaces())) {
    for (const i of list) {
      if (i.family === 'IPv4' && !i.internal) kandidat.push({ nama, ip: i.address });
    }
  }
  const wifi = kandidat.find((k) => /wi-?fi|wlan|wireless/i.test(k.nama));
  if (wifi) return wifi.ip;
  const nyata = kandidat.find((k) => !ADAPTER_VIRTUAL.test(k.nama));
  if (nyata) return nyata.ip;
  return kandidat.length ? kandidat[0].ip : 'localhost';
}

// Alamat dasar untuk QR. Urutan prioritas:
// 1) BASE_URL (kalau diset manual)
// 2) alamat yang dipakai browser saat membuka halaman (kalau bukan localhost)
// 3) IP WiFi laptop yang terdeteksi otomatis
function urlDasar(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const host = req && req.get('host');
  if (host && !/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(host)) {
    return `${req.protocol}://${host}`;
  }
  return `http://${ipLokal()}:${PORT}`;
}

// ---------- Helper ----------
function buatKodeTiket() {
  return 'PK-' + crypto.randomBytes(4).toString('hex').toUpperCase(); // contoh: PK-9F3A1C7E
}

function bersihkanPlat(plat) {
  if (!plat) return null;
  const p = String(plat).trim().toUpperCase().replace(/\s+/g, ' ');
  return p === '' ? null : p.slice(0, 15);
}

function hitungDurasiDanBiaya(waktuMasukIso, waktuKeluarIso) {
  const masuk = new Date(waktuMasukIso).getTime();
  const keluar = new Date(waktuKeluarIso).getTime();
  const menit = Math.max(1, Math.ceil((keluar - masuk) / 60000));
  const jam = Math.max(1, Math.ceil(menit / 60));

  const jamPertama = parseInt(getSetting('tarif_jam_pertama'), 10);
  const perJam = parseInt(getSetting('tarif_per_jam'), 10);
  const biaya = jamPertama + (jam - 1) * perJam;

  return { menit, jam, biaya };
}

// ---------- Ringkasan slot (total dan per kategori) ----------
router.get('/status', (req, res) => {
  const rows = db.prepare(`
    SELECT kategori, status, COUNT(*) AS n
    FROM slots
    GROUP BY kategori, status
  `).all();

  const kosongan = () => ({ total: 0, terisi: 0, kosong: 0 });
  const hasil = { ...kosongan(), motor: kosongan(), mobil: kosongan() };

  for (const r of rows) {
    if (!KATEGORI.includes(r.kategori)) continue;
    const jenis = r.status === 'terisi' ? 'terisi' : 'kosong';
    hasil[r.kategori].total += r.n;
    hasil[r.kategori][jenis] += r.n;
    hasil.total += r.n;
    hasil[jenis] += r.n;
  }
  res.json(hasil);
});

// ---------- Gerbang masuk: ambil tiket ----------
router.post('/tiket', async (req, res) => {
  try {
    const plat = bersihkanPlat(req.body && req.body.plat);

    // Kalau kategori tidak dikirim dianggap motor; nilai lain yang tidak dikenal ditolak
    const kategori = req.body && req.body.kategori !== undefined ? req.body.kategori : 'motor';
    if (!KATEGORI.includes(kategori)) {
      return res.status(400).json({ error: 'Pilih jenis kendaraan: motor atau mobil' });
    }

    const ambilTiket = db.transaction(() => {
      const slot = db
        .prepare("SELECT id, kode FROM slots WHERE status = 'kosong' AND kategori = ? ORDER BY id LIMIT 1")
        .get(kategori);
      if (!slot) return null;

      const kode = buatKodeTiket();
      const waktuMasuk = new Date().toISOString();

      db.prepare(
        'INSERT INTO tickets (kode, slot_id, plat, waktu_masuk) VALUES (?, ?, ?, ?)'
      ).run(kode, slot.id, plat, waktuMasuk);
      db.prepare("UPDATE slots SET status = 'terisi' WHERE id = ?").run(slot.id);

      return { kode, slot: slot.kode, kategori, plat, waktu_masuk: waktuMasuk };
    });

    const tiket = ambilTiket();
    if (!tiket) {
      return res.status(409).json({ error: `Parkir ${kategori} penuh, tidak ada slot kosong` });
    }

    tiket.url = `${urlDasar(req)}/t/${tiket.kode}`;
    // QR untuk scan di gerbang keluar (berisi kode tiket)
    tiket.qr = await QRCode.toDataURL(tiket.kode, { width: 300, margin: 1 });
    // QR untuk dibuka di HP (berisi alamat tiket digital)
    tiket.qr_url = await QRCode.toDataURL(tiket.url, { width: 400, margin: 2 });
    res.status(201).json(tiket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membuat tiket' });
  }
});

// ---------- Gerbang keluar: cek tiket (belum keluar) ----------
router.get('/tiket/:kode', async (req, res) => {
  try {
    const kode = String(req.params.kode).trim().toUpperCase();
    const t = db.prepare(`
      SELECT t.kode, t.plat, t.waktu_masuk, t.waktu_keluar, t.biaya, t.status, s.kode AS slot
      FROM tickets t JOIN slots s ON s.id = t.slot_id
      WHERE t.kode = ?
    `).get(kode);

    if (!t) return res.status(404).json({ error: 'Tiket tidak ditemukan' });

    if (t.status === 'aktif') {
      const hitung = hitungDurasiDanBiaya(t.waktu_masuk, new Date().toISOString());
      t.durasi_menit = hitung.menit;
      t.biaya_sementara = hitung.biaya;
    }
    t.qr = await QRCode.toDataURL(t.kode, { width: 300, margin: 1 });
    res.json(t);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membaca tiket' });
  }
});

// ---------- Gerbang keluar: proses keluar ----------
router.post('/keluar', (req, res) => {
  const kode = String((req.body && req.body.kode) || '').trim().toUpperCase();
  if (!kode) return res.status(400).json({ error: 'Kode tiket wajib diisi' });

  const proses = db.transaction(() => {
    const t = db.prepare(`
      SELECT t.id, t.kode, t.plat, t.waktu_masuk, t.status, t.slot_id, s.kode AS slot
      FROM tickets t JOIN slots s ON s.id = t.slot_id
      WHERE t.kode = ?
    `).get(kode);

    if (!t) return { status: 404, body: { error: 'Tiket tidak ditemukan' } };
    if (t.status !== 'aktif') {
      return { status: 409, body: { error: 'Tiket sudah dipakai untuk keluar' } };
    }

    const waktuKeluar = new Date().toISOString();
    const { menit, jam, biaya } = hitungDurasiDanBiaya(t.waktu_masuk, waktuKeluar);

    db.prepare(
      "UPDATE tickets SET waktu_keluar = ?, biaya = ?, status = 'selesai' WHERE id = ?"
    ).run(waktuKeluar, biaya, t.id);
    db.prepare("UPDATE slots SET status = 'kosong' WHERE id = ?").run(t.slot_id);

    return {
      status: 200,
      body: {
        kode: t.kode,
        plat: t.plat,
        slot: t.slot,
        waktu_masuk: t.waktu_masuk,
        waktu_keluar: waktuKeluar,
        durasi_menit: menit,
        jam_ditagih: jam,
        biaya,
      },
    };
  });

  const hasil = proses();
  res.status(hasil.status).json(hasil.body);
});

// ---------- Admin: daftar slot + tiket aktif di dalamnya ----------
router.get('/admin/slots', (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.kode, s.kategori, s.status,
           t.kode AS tiket, t.plat, t.waktu_masuk
    FROM slots s
    LEFT JOIN tickets t ON t.slot_id = s.id AND t.status = 'aktif'
    ORDER BY s.id
  `).all();
  res.json(rows);
});

// ---------- Admin: tambah slot (satu kode atau rentang, misal C001-C015) ----------
function ubahKeDaftarKode(teks) {
  const t = String(teks || '').trim().toUpperCase().replace(/\s+/g, '');
  const m = t.match(/^([A-Z]+)(\d+)-([A-Z]*)(\d+)$/);

  // Bukan rentang: perlakukan sebagai satu kode (contoh: C-01 atau Z9)
  if (!m) {
    if (!/^[A-Z0-9-]{1,10}$/.test(t)) {
      return { error: 'Kode tidak valid. Contoh: C001-C015 (rentang) atau C001 (satu slot)' };
    }
    return { daftar: [t] };
  }

  const [, awalan, dari, awalanAkhir, sampai] = m;
  if (awalanAkhir && awalanAkhir !== awalan) {
    return { error: 'Huruf awal dan akhir harus sama, contoh: C001-C015' };
  }

  const a = parseInt(dari, 10);
  const b = parseInt(sampai, 10);
  if (b < a) return { error: 'Nomor akhir harus lebih besar dari nomor awal' };
  if (b - a + 1 > 300) return { error: 'Maksimal 300 slot sekali buat' };

  const lebar = dari.length; // C001 -> 3 digit
  const daftar = [];
  for (let i = a; i <= b; i++) {
    const kode = awalan + String(i).padStart(lebar, '0');
    if (kode.length > 10) return { error: 'Kode terlalu panjang (maksimal 10 karakter)' };
    daftar.push(kode);
  }
  return { daftar };
}

router.post('/admin/slots', (req, res) => {
  const kategori = req.body && req.body.kategori !== undefined ? req.body.kategori : 'motor';
  if (!KATEGORI.includes(kategori)) {
    return res.status(400).json({ error: 'Pilih jenis kendaraan: motor atau mobil' });
  }

  const h = ubahKeDaftarKode(req.body && req.body.kode);
  if (h.error) return res.status(400).json({ error: h.error });

  const tambah = db.transaction(() => {
    const ins = db.prepare('INSERT OR IGNORE INTO slots (kode, kategori) VALUES (?, ?)');
    let dibuat = 0;
    for (const kode of h.daftar) dibuat += ins.run(kode, kategori).changes;
    return dibuat;
  });

  const dibuat = tambah();
  if (dibuat === 0) {
    return res.status(409).json({ error: 'Semua kode sudah ada, tidak ada slot baru' });
  }
  res.status(201).json({
    ok: true,
    dibuat,
    dilewati: h.daftar.length - dibuat, // kode yang sudah ada tidak dibuat dua kali
    pertama: h.daftar[0],
    terakhir: h.daftar[h.daftar.length - 1],
    kategori,
  });
});

// ---------- Admin: riwayat tiket (filter status, tempat, dan pencarian) ----------
router.get('/admin/tiket', (req, res) => {
  const kondisi = [];
  const params = [];

  // Filter status
  const status = req.query.status;
  if (status === 'aktif' || status === 'selesai') {
    kondisi.push('t.status = ?');
    params.push(status);
  }

  // Filter tempat: huruf depan kode slot (A, B, C, ...)
  const blok = String(req.query.blok || '').trim().toUpperCase();
  if (/^[A-Z]{1,5}$/.test(blok)) {
    kondisi.push('s.kode GLOB ?');
    params.push(blok + '[0-9-]*');
  }

  // Pencarian: kode tiket, plat nomor, atau kode slot
  const q = String(req.query.q || '').toUpperCase().replace(/\s+/g, '').slice(0, 30);
  if (q) {
    const pola = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
    kondisi.push(
      "(UPPER(t.kode) LIKE ? ESCAPE '\\' " +
      "OR REPLACE(UPPER(COALESCE(t.plat, '')), ' ', '') LIKE ? ESCAPE '\\' " +
      "OR UPPER(s.kode) LIKE ? ESCAPE '\\')"
    );
    params.push(pola, pola, pola);
  }

  const where = kondisi.length ? 'WHERE ' + kondisi.join(' AND ') : '';

  const rows = db.prepare(`
    SELECT t.kode, t.plat, t.waktu_masuk, t.waktu_keluar, t.biaya, t.status, s.kode AS slot
    FROM tickets t JOIN slots s ON s.id = t.slot_id
    ${where}
    ORDER BY t.id DESC
    LIMIT 100
  `).all(...params);
  res.json(rows);
});

// ---------- Admin: tarif ----------
router.get('/admin/settings', (req, res) => {
  res.json({
    tarif_jam_pertama: parseInt(getSetting('tarif_jam_pertama'), 10),
    tarif_per_jam: parseInt(getSetting('tarif_per_jam'), 10),
  });
});

router.put('/admin/settings', (req, res) => {
  const a = parseInt(req.body && req.body.tarif_jam_pertama, 10);
  const b = parseInt(req.body && req.body.tarif_per_jam, 10);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    return res.status(400).json({ error: 'Tarif harus berupa angka 0 atau lebih' });
  }
  setSetting('tarif_jam_pertama', a);
  setSetting('tarif_per_jam', b);
  res.json({ ok: true, tarif_jam_pertama: a, tarif_per_jam: b });
});

// ---------- Admin: hapus satu tiket ----------
router.delete('/admin/tiket/:kode', (req, res) => {
  const kode = String(req.params.kode).trim().toUpperCase();

  const hapus = db.transaction(() => {
    const t = db.prepare('SELECT id, slot_id, status FROM tickets WHERE kode = ?').get(kode);
    if (!t) return false;
    // Tiket aktif masih menempati slot, jadi slotnya dikosongkan lagi
    if (t.status === 'aktif') {
      db.prepare("UPDATE slots SET status = 'kosong' WHERE id = ?").run(t.slot_id);
    }
    db.prepare('DELETE FROM tickets WHERE id = ?').run(t.id);
    return true;
  });

  if (!hapus()) return res.status(404).json({ error: 'Tiket tidak ditemukan' });
  res.json({ ok: true, kode });
});

// ---------- Admin: hapus semua tiket SELESAI (tiket aktif tidak disentuh) ----------
router.delete('/admin/tiket', (req, res) => {
  const hapus = db.transaction(() => {
    const aktif = db
      .prepare("SELECT COUNT(*) AS n FROM tickets WHERE status = 'aktif'")
      .get().n;
    // Slot tidak perlu diubah: slot tiket selesai sudah kosong sejak kendaraan keluar
    const dihapus = db
      .prepare("DELETE FROM tickets WHERE status = 'selesai'")
      .run().changes;
    return { dihapus, aktif };
  });

  const h = hapus();
  res.json({ ok: true, dihapus: h.dihapus, aktif_dipertahankan: h.aktif });
});

// ---------- Admin: ubah kode slot ----------
router.put('/admin/slots/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const kode = String((req.body && req.body.kode) || '').trim().toUpperCase();

  if (!/^[A-Z0-9-]{1,10}$/.test(kode)) {
    return res.status(400).json({ error: 'Kode slot tidak valid (huruf, angka, strip; maks 10 karakter)' });
  }
  if (!db.prepare('SELECT id FROM slots WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Slot tidak ditemukan' });
  }

  try {
    db.prepare('UPDATE slots SET kode = ? WHERE id = ?').run(kode, id);
    res.json({ ok: true, kode });
  } catch (err) {
    res.status(409).json({ error: 'Kode slot sudah dipakai slot lain' });
  }
});

// ---------- Admin: hapus slot (hanya yang kosong) ----------
router.delete('/admin/slots/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  const proses = db.transaction(() => {
    const s = db.prepare('SELECT id, status FROM slots WHERE id = ?').get(id);
    if (!s) return { status: 404, body: { error: 'Slot tidak ditemukan' } };

    const aktif = db
      .prepare("SELECT COUNT(*) AS n FROM tickets WHERE slot_id = ? AND status = 'aktif'")
      .get(id).n;
    if (s.status === 'terisi' || aktif > 0) {
      return {
        status: 409,
        body: { error: 'Slot sedang terisi. Proses keluar atau hapus tiket aktifnya dulu.' },
      };
    }

    // Riwayat tiket selesai di slot ini ikut dihapus (relasi database mewajibkannya)
    const n = db.prepare('DELETE FROM tickets WHERE slot_id = ?').run(id).changes;
    db.prepare('DELETE FROM slots WHERE id = ?').run(id);
    return { status: 200, body: { ok: true, tiket_dihapus: n } };
  });

  const h = proses();
  res.status(h.status).json(h.body);
});

module.exports = router;
module.exports.hitungDurasiDanBiaya = hitungDurasiDanBiaya;