const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { seedCars } = require('./seedCars');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'cars.db');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function columnExists(db, table, name) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((c) => c.name === name);
}

function initDb() {
  ensureDataDir();
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      price_per_day REAL NOT NULL,
      fuel TEXT NOT NULL,
      seats INTEGER NOT NULL,
      year INTEGER NOT NULL,
      km INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id)
    );
  `);

  if (!columnExists(db, 'reservations', 'user_id')) {
    db.exec('ALTER TABLE reservations ADD COLUMN user_id INTEGER REFERENCES users(id)');
  }
  if (!columnExists(db, 'reservations', 'status')) {
    db.exec("ALTER TABLE reservations ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
  }
  if (!columnExists(db, 'reservations', 'payment_method')) {
    db.exec("ALTER TABLE reservations ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'on_site'");
  }
  if (!columnExists(db, 'reservations', 'payment_status')) {
    db.exec("ALTER TABLE reservations ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'paid'");
  }
  if (!columnExists(db, 'reservations', 'amount_cents')) {
    db.exec('ALTER TABLE reservations ADD COLUMN amount_cents INTEGER');
  }
  if (!columnExists(db, 'reservations', 'stripe_checkout_session_id')) {
    db.exec('ALTER TABLE reservations ADD COLUMN stripe_checkout_session_id TEXT');
  }

  const count = db.prepare('SELECT COUNT(*) AS c FROM cars').get().c;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO cars (image_url, name, brand, price_per_day, fuel, seats, year, km)
      VALUES (@image_url, @name, @brand, @price_per_day, @fuel, @seats, @year, @km)
    `);
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run(row);
    });
    insertMany(seedCars);
  }

  const adminEmail = 'admin@autoloc.demo';
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!adminExists) {
    const hash = bcrypt.hashSync('AdminDemo2026!', 10);
    db.prepare(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES (?, ?, 'Administrateur démo', 'admin')`
    ).run(adminEmail, hash);
  }

  return db;
}

module.exports = { initDb, dbPath };
