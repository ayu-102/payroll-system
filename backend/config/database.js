import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./payroll.db', (err) => {
    if (err) console.error('Gagal koneksi database:', err.message);
    else console.log('Terhubung ke database SQLite (payroll.db).');
});

// Otomatis bikin tabel & seed data pas server dinyalain
db.serialize(() => {
    // 1. Tabel Karyawan
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
            // Data Karyawan 1: Sukamto
            db.run(`INSERT OR IGNORE INTO karyawan (id, nama, email, password, jabatan, gaji_pokok, role, status) 
                    VALUES (1, 'Sukamto', 'kamto@company.com', 'kamto123', 'Operasional', 4500000, 'karyawan', 'active')`);

            // Data Karyawan 2: Budi Santoso
            db.run(`INSERT OR IGNORE INTO karyawan (id, nama, email, password, jabatan, gaji_pokok, role, status) 
                    VALUES (2, 'Budi Santoso', 'budi@gmail.com', '123456', 'Staff IT', 5000000, 'karyawan', 'active')`);

            console.log("✅ Tabel 'karyawan' siap (Sukamto & Budi Santoso)!");
        }
    });

    // 2. Tabel Payroll (Slip Gaji)
    db.run(`CREATE TABLE IF NOT EXISTS payroll (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        karyawan_id INTEGER,
        periode TEXT NOT NULL,
        tunjangan_lembur REAL DEFAULT 0,
        tunjangan_bonus REAL DEFAULT 0,
        potongan_bpjs REAL DEFAULT 0,
        potongan_absen REAL DEFAULT 0,
        gaji_bersih REAL DEFAULT 0,
        hari_absen INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Paid',
        FOREIGN KEY(karyawan_id) REFERENCES karyawan(id)
    )`, (err) => {
        if (!err) {
            // Slip Gaji Sukamto (id payroll = 1, relasi karyawan_id = 1)
            db.run(`
                INSERT OR IGNORE INTO payroll (
                    id, karyawan_id, periode, tunjangan_lembur, tunjangan_bonus, 
                    potongan_bpjs, potongan_absen, gaji_bersih, hari_absen, status
                ) VALUES (
                    1, 1, 'Juli 2026', 0, 0, 
                    150000, 50000, 4300000, 0, 'Paid'
                )
            `);

            // Slip Gaji Budi Santoso (id payroll = 2, relasi karyawan_id = 2)
            db.run(`
                INSERT OR IGNORE INTO payroll (
                    id, karyawan_id, periode, tunjangan_lembur, tunjangan_bonus, 
                    potongan_bpjs, potongan_absen, gaji_bersih, hari_absen, status
                ) VALUES (
                    2, 2, 'Juli 2026', 0, 0, 
                    150000, 50000, 4800000, 0, 'Paid'
                )
            `);

            console.log("✅ Tabel 'payroll' siap!");
        }
    });
});

export default db;