const express = require('express');
const path = require('path');
const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { db } = require('./db');

const api = require('./routes/api');
const { hitungDurasiDanBiaya } = api;

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Helper tampilan ----------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function rupiah(n) {
  return 'Rp' + Number(n).toLocaleString('id-ID');
}

function fmtWaktu(iso) {
  return iso ? new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-';
}

function fmtWaktuPendek(iso) {
  return new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDurasi(menit) {
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  return j === 0 ? m + ' menit' : j + ' jam ' + m + ' menit';
}

function halaman(judul, isi) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(judul)}</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <main class="container narrow">${isi}</main>
</body>
</html>`;
}

// ---------- Gambar tiket (PNG) ----------
// Warna dan susunan mengikuti kartu tiket di halaman web (.ticket di style.css)

// Persegi dengan sudut membulat (dipakai untuk garis tepi kartu)
function jalurBulat(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

async function buatGambarTiket(t) {
  const W = 600, H = 900;
  const canvas = createCanvas(W, H);
  const g = canvas.getContext('2d');

  // Latar kartu: maroon, sama seperti .ticket
  g.fillStyle = '#7B0948';
  g.fillRect(0, 0, W, H);

  // Garis tepi putus-putus putih dengan sudut membulat
  g.strokeStyle = '#ffffff';
  g.lineWidth = 4;
  g.setLineDash([14, 10]);
  jalurBulat(g, 20, 20, W - 40, H - 40, 28);
  g.stroke();
  g.setLineDash([]);

  g.textAlign = 'center';

  // Judul
  g.fillStyle = '#ffffff';
  g.font = 'bold 24px Arial';
  g.letterSpacing = '4px';
  g.fillText('TIKET PARKIR', W / 2, 80);
  g.letterSpacing = '0px';

  // Nomor slot
  g.fillStyle = '#f4f6fa';
  g.font = 'bold 120px Arial';
  g.fillText(t.slot, W / 2, 210);

  g.fillStyle = '#ffffff';
  g.font = '26px Arial';
  g.fillText('Nomor tempat parkir Anda', W / 2, 255);

  // QR code (hitam di atas putih, sama seperti di web)
  const qrBuf = await QRCode.toBuffer(t.kode, { width: 360, margin: 1 });
  const qrImg = await loadImage(qrBuf);
  g.drawImage(qrImg, (W - 360) / 2, 290, 360, 360);

  // Kode tiket
  g.fillStyle = '#ffffff';
  g.font = 'bold 36px "Courier New"';
  g.fillText(t.kode, W / 2, 710);

  // Garis pemisah putus-putus sebelum detail
  g.strokeStyle = '#cbd5e1';
  g.lineWidth = 2;
  g.setLineDash([10, 8]);
  g.beginPath();
  g.moveTo(70, 745);
  g.lineTo(W - 70, 745);
  g.stroke();
  g.setLineDash([]);

  // Detail
  g.fillStyle = '#ffffff';
  g.font = '28px Arial';
  g.textAlign = 'left';
  g.fillText('Plat nomor', 70, 795);
  g.fillText('Waktu masuk', 70, 845);

  g.font = 'bold 28px Arial';
  g.textAlign = 'right';
  g.fillText(t.plat || '-', W - 70, 795);
  g.fillText(fmtWaktuPendek(t.waktu_masuk), W - 70, 845);

  return canvas.encode('png');
}

// ---------- Middleware ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- API ----------
app.use('/api', api);

// ---------- Halaman ----------
app.get('/', (req, res) => res.redirect('/masuk'));

app.get('/masuk', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'masuk.html'))
);

app.get('/keluar', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'keluar.html'))
);

app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin.html'))
);

// ---------- Gambar tiket PNG ----------
app.get('/t/:kode/gambar.png', async (req, res) => {
  try {
    const kode = String(req.params.kode).trim().toUpperCase();

    const t = db.prepare(`
      SELECT t.kode, t.plat, t.waktu_masuk, s.kode AS slot
      FROM tickets t JOIN slots s ON s.id = t.slot_id
      WHERE t.kode = ?
    `).get(kode);

    if (!t) return res.status(404).send('Tiket tidak ditemukan');

    const png = await buatGambarTiket(t);
    const mode = req.query.unduh ? 'attachment' : 'inline';

    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `${mode}; filename="tiket-${t.kode}.png"`,
      'Cache-Control': 'no-store',
    });

    res.send(png);
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal membuat gambar tiket');
  }
});

// ---------- Tiket Digital ----------
app.get('/t/:kode', async (req, res) => {
  res.set('Cache-Control', 'no-store');

  try {
    const kode = String(req.params.kode).trim().toUpperCase();

    const t = db.prepare(`
      SELECT t.kode, t.plat, t.waktu_masuk, t.waktu_keluar,
             t.biaya, t.status, s.kode AS slot
      FROM tickets t JOIN slots s ON s.id = t.slot_id
      WHERE t.kode = ?
    `).get(kode);

    if (!t) {
      return res.status(404).send(halaman(
        'Tiket tidak ditemukan',
        '<h1>Tiket Digital</h1><div class="alert error">Tiket tidak ditemukan.</div>'
      ));
    }

    const aktif = t.status === 'aktif';
    const akhir = aktif ? new Date().toISOString() : t.waktu_keluar;
    const h = hitungDurasiDanBiaya(t.waktu_masuk, akhir);
    const biaya = aktif ? h.biaya : t.biaya;

    const qr = await QRCode.toDataURL(t.kode, {
      width: 300,
      margin: 1
    });

    const kodeUrl = encodeURIComponent(t.kode);

    const isi = `
<h1 class="digital-title">Tiket Digital</h1>

<p class="digital-description">
  ${aktif ? 'Tunjukkan QR ini ke scanner di gerbang keluar.' : 'Struk parkir Anda.'}
</p>

      <div class="ticket">
        <div class="title">Tiket Parkir</div>

        <div class="slot">${esc(t.slot)}</div>

        <div class="slot-label">
          Nomor tempat parkir Anda
        </div>

        <img src="${qr}" alt="QR code tiket">

        <div class="kode">${esc(t.kode)}</div>

        <div class="info">
          <div>
            <span>Plat nomor</span>
            <b>${esc(t.plat || '-')}</b>
          </div>

          <div>
            <span>Waktu masuk</span>
            <b>${esc(fmtWaktu(t.waktu_masuk))}</b>
          </div>

          ${aktif ? '' : `
            <div>
              <span>Waktu keluar</span>
              <b>${esc(fmtWaktu(t.waktu_keluar))}</b>
            </div>
          `}

          <div>
            <span>Durasi parkir</span>
            <b>${esc(fmtDurasi(h.menit))}</b>
          </div>

          <div>
            <span>${aktif ? 'Estimasi biaya' : 'Total biaya'}</span>
            <b>${esc(rupiah(biaya))}</b>
          </div>
        </div>
      </div>

      ${aktif
        ? `
          <a class="btn"
             style="display:block;margin-top:16px;text-align:center;text-decoration:none"
             href="/t/${kodeUrl}/gambar.png?unduh=1">
            Simpan Tiket ke HP
          </a>

          <p class="hintt" style="text-align:center">
            Kalau tidak tersimpan otomatis,
            <a href="/t/${kodeUrl}/gambar.png">buka gambar tiket</a>,
            lalu tahan lama pada gambar dan pilih "Simpan gambar".
          </p>
        `
        : `
          <div class="alert success" style="margin-top:16px">
            Tiket ini sudah dipakai untuk keluar. Terima kasih!
          </div>
        `
      }
    `;

    res.send(halaman('Tiket Parkir ' + t.kode, isi));

  } catch (err) {
    console.error(err);

    res.status(500).send(halaman(
      'Galat',
      '<h1>Tiket Digital</h1><div class="alert error">Terjadi kesalahan di server.</div>'
    ));
  }
});

// ---------- 404 untuk rute API ----------
app.use('/api', (req, res) =>
  res.status(404).json({ error: 'Endpoint tidak ditemukan' })
);

// ---------- Jalankan server ----------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server parkir jalan di http://localhost:${PORT}`);
  console.log(`  Gerbang masuk : http://localhost:${PORT}/masuk`);
  console.log(`  Gerbang keluar: http://localhost:${PORT}/keluar`);
  console.log(`  Admin         : http://localhost:${PORT}/admin`);
});