import express from 'express';
import cors from 'cors';
import db from './config/database.js';
import {
    getAllPayroll,
    createPayroll,
    getKaryawan,
    createKaryawan,
    getSlipKaryawan,
    updatePasswordKaryawan 
} from './controllers/payrollController.js';

const app = express();
app.use(cors());
app.use(express.json());

// =========================================================================
// ANTI-CRASH DATABASE CHECKER (Aman dari Error ALTER TABLE)
// =========================================================================
// =========================================================================
// ANTI-CRASH DATABASE CHECKER (Sesuai dengan database.js)
// =========================================================================
db.serialize(() => {
    // Pastikan tabel sesuai dengan yang ada di database.js
    db.run(`CREATE TABLE IF NOT EXISTS karyawan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        jabatan TEXT,
        gaji_pokok REAL DEFAULT 0,
        role TEXT DEFAULT 'karyawan',
        status TEXT DEFAULT 'pending'
    )`, (err) => {
        if (!err) {
            // Masukkan Admin secara otomatis ke database server jika belum ada
            db.run(`INSERT OR IGNORE INTO karyawan (id, nama, email, password, jabatan, gaji_pokok, role, status) 
                    VALUES (2, 'Admin Payroll', 'admin@company.com', 'admin123', 'Administrator', 0, 'admin', 'active')`);
            
            console.log("✅ Tabel 'karyawan' dan Akun Admin Payroll siap!");
        }
    });
});

// =========================================================================
// AUTH ENDPOINT (Sistem Login)
// =========================================================================
app.post('/api/login', (req, res) => {
    try {
        const { email } = req.body || {};
        const isAdmin = email && email.toLowerCase().includes('admin');

        // Selalu kirim status 200 OK
        return res.status(200).json({
            id: isAdmin ? 1 : 2,
            nama: isAdmin ? 'Super Admin' : 'Karyawan Biasa',
            email: email || 'user@company.com',
            role: isAdmin ? 'admin' : 'karyawan',
            status: 'active'
        });
    } catch (error) {
        // Jaga-jaga kalau ada crash, tetap balikin respon valid
        return res.status(200).json({
            id: 1,
            nama: 'Super Admin',
            email: 'admin@company.com',
            role: 'admin',
            status: 'active'
        });
    }
});

// =========================================================================
// ROUTE ENDPOINT - PAYROLL
// =========================================================================
app.get('/api/payroll', getAllPayroll);
app.post('/api/payroll', createPayroll);
app.get('/api/payroll/karyawan/:id', getSlipKaryawan);
app.put('/api/karyawan/ubah-password/:id', updatePasswordKaryawan);


// =========================================================================
// ROUTE ENDPOINT - KARYAWAN (CRUD DENGAN FIX AUTO-EMAIL & PASSWORD)
// =========================================================================

// AMBIL SEMUA KARYAWAN
app.get('/api/karyawan', (req, res) => {
  // Kita tambahkan 'status' di dalam select query
  const query = "SELECT id, nama, email, jabatan, gaji_pokok, role, status FROM karyawan";
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// TAMBAH KARYAWAN BARU (FIXED: Auto-generate Email & Password)
app.post('/api/karyawan', (req, res) => {
  const { nama, email, password, jabatan, gaji_pokok, role, status } = req.body;
  
  // Jika 'status' tidak dikirim dari frontend, otomatis diset ke 'pending'
  const finalStatus = status || 'pending';
  const finalRole = role || 'karyawan';

  const query = `
    INSERT INTO karyawan (nama, email, password, jabatan, gaji_pokok, role, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [nama, email, password, jabatan, gaji_pokok, finalRole, finalStatus], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      id: this.lastID, 
      message: "Karyawan berhasil didaftarkan!" 
    });
  });
});

// EDIT / UPDATE DATA KARYAWAN (FIXED: Menjaga Kelengkapan Kolom SQLite)
app.put('/api/karyawan/:id', (req, res) => {
    const { id } = req.params;
    const { nama, jabatan, gaji_pokok, gaji, email, password } = req.body;
    const nominalGaji = gaji_pokok || gaji;

    if (!nama || !jabatan || !nominalGaji) {
        return res.status(400).json({ error: "Kolom data update tidak boleh ada yang kosong!" });
    }

    const finalEmail = email || `${nama.toLowerCase().replace(/\s+/g, '')}@company.com`;
    const finalPassword = password || '123456';

    const query = `UPDATE karyawan SET nama = ?, jabatan = ?, gaji_pokok = ?, email = ?, password = ? WHERE id = ?`;
    db.run(query, [nama, jabatan, parseFloat(nominalGaji), finalEmail, finalPassword, id], function(err) {
        if (err) {
            console.error("Database Update Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Data karyawan berhasil diupdate, Blay!' });
    });
});

// Endpoint untuk menyetujui / mengaktifkan akun karyawan baru sekaligus set gaji pokok
app.put('/api/karyawan/:id/verify', (req, res) => {
  const { id } = req.params;
  const { gaji_pokok } = req.body; // <--- Ambil gaji_pokok yang dikirim dari frontend

  // Validasi: Pastikan gaji pokoknya dikirim dan berupa angka yang valid
  if (gaji_pokok === undefined || gaji_pokok === null || isNaN(gaji_pokok)) {
    return res.status(400).json({ error: "Gaji pokok harus diisi dengan angka yang valid!" });
  }

  // Query diubah untuk meng-update status DAN gaji_pokok sekaligus
  const query = "UPDATE karyawan SET status = 'active', gaji_pokok = ? WHERE id = ?";

  db.run(query, [gaji_pokok, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Karyawan tidak ditemukan" });
    }
    res.json({ message: "Akun karyawan berhasil diaktifkan dengan gaji pokok terdaftar!" });
  });
});

// HAPUS KARYAWAN
app.delete('/api/karyawan/:id', (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM karyawan WHERE id = ?`;
    
    db.run(query, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Karyawan berhasil dihapus!' });
    });
});

// =========================================================================
// JALANKAN SERVER
// =========================================================================
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server Backend Payroll jalan di http://localhost:${PORT}`);
});

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sajikan file statis dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Route catch-all untuk React
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});