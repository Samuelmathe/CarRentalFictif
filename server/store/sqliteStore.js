function createSqliteStore(db) {
  return {
    mode: 'sqlite',

    async carsList() {
      return db.prepare('SELECT * FROM cars ORDER BY id').all();
    },

    async carById(id) {
      const n = Number.parseInt(String(id), 10);
      if (!Number.isInteger(n) || n < 1) return null;
      return db.prepare('SELECT * FROM cars WHERE id = ?').get(n) || null;
    },

    async carExists(id) {
      const row = await this.carById(id);
      return Boolean(row);
    },

    async createCar(payload) {
      const info = db
        .prepare(
          `INSERT INTO cars (image_url, name, brand, price_per_day, fuel, seats, year, km)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          payload.image_url,
          payload.name,
          payload.brand,
          payload.price_per_day,
          payload.fuel,
          payload.seats,
          payload.year,
          payload.km
        );
      return db.prepare('SELECT * FROM cars WHERE id = ?').get(info.lastInsertRowid);
    },

    async updateCar(id, payload) {
      const n = Number.parseInt(String(id), 10);
      if (!Number.isInteger(n) || n < 1) return null;
      const row = db.prepare('SELECT * FROM cars WHERE id = ?').get(n);
      if (!row) return null;
      const image_url = payload.image_url ?? row.image_url;
      const name = payload.name ?? row.name;
      const brand = payload.brand ?? row.brand;
      const fuel = payload.fuel ?? row.fuel;
      const price_per_day = payload.price_per_day ?? row.price_per_day;
      const seats = payload.seats ?? row.seats;
      const year = payload.year ?? row.year;
      const km = payload.km ?? row.km;
      db.prepare(
        `UPDATE cars SET image_url=?, name=?, brand=?, price_per_day=?, fuel=?, seats=?, year=?, km=?
         WHERE id=?`
      ).run(image_url, name, brand, price_per_day, fuel, seats, year, km, n);
      return db.prepare('SELECT * FROM cars WHERE id = ?').get(n);
    },

    async deleteCar(id) {
      const n = Number.parseInt(String(id), 10);
      if (!Number.isInteger(n) || n < 1) return false;
      const car = db.prepare('SELECT id FROM cars WHERE id = ?').get(n);
      if (!car) return false;
      db.prepare('DELETE FROM reservations WHERE car_id = ?').run(n);
      db.prepare('DELETE FROM cars WHERE id = ?').run(n);
      return true;
    },

    async findUserByEmail(email) {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
    },

    async findUserById(userId) {
      const n = Number.parseInt(String(userId), 10);
      if (!Number.isInteger(n) || n < 1) return null;
      return db.prepare('SELECT * FROM users WHERE id = ?').get(n) || null;
    },

    async createUser({ email, password_hash, display_name, role }) {
      const info = db
        .prepare(
          `INSERT INTO users (email, password_hash, display_name, role)
           VALUES (?, ?, ?, ?)`
        )
        .run(email, password_hash, display_name, role || 'user');
      const row = db.prepare('SELECT id, email, display_name, role FROM users WHERE id = ?').get(info.lastInsertRowid);
      return row;
    },

    async createReservation({ car_id, customer_name, email, start_date, end_date, user_id }) {
      const cid = Number.parseInt(String(car_id), 10);
      const info = db
        .prepare(
          `INSERT INTO reservations (car_id, customer_name, email, start_date, end_date, user_id, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')`
        )
        .run(cid, customer_name, email, String(start_date), String(end_date), user_id != null ? Number(user_id) : null);
      return { id: info.lastInsertRowid };
    },

    async reservationsForUser(userId) {
      const n = Number.parseInt(String(userId), 10);
      if (!Number.isInteger(n) || n < 1) return [];
      return db
        .prepare(
          `SELECT r.*, c.name AS car_name, c.brand AS car_brand
           FROM reservations r
           JOIN cars c ON c.id = r.car_id
           WHERE r.user_id = ?
           ORDER BY r.created_at DESC`
        )
        .all(n);
    },

    async reservationsListAdmin() {
      return db
        .prepare(
          `SELECT r.*, c.name AS car_name
           FROM reservations r
           JOIN cars c ON c.id = r.car_id
           ORDER BY r.created_at DESC`
        )
        .all();
    },

    async updateReservationStatus(id, status) {
      const n = Number.parseInt(String(id), 10);
      if (!Number.isInteger(n) || n < 1) return null;
      const info = db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, n);
      if (info.changes === 0) return null;
      return db.prepare('SELECT * FROM reservations WHERE id = ?').get(n);
    },
  };
}

module.exports = { createSqliteStore };
