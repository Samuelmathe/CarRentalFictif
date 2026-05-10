const { Router } = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');

function createAdminRouter(store) {
  const r = Router();

  r.get('/reservations', asyncHandler(async (_req, res) => {
    try {
      const rows = await store.reservationsListAdmin();
      res.json(rows);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      res.status(500).json({ error: 'Lecture impossible.' });
    }
  }));

  r.post('/reservations/:id/confirm-physical-payment', asyncHandler(async (req, res) => {
    try {
      const row = await store.confirmPhysicalPayment(req.params.id);
      if (!row) {
        return res.status(400).json({
          error: 'Confirmation impossible (réservation introuvable, déjà payée, ou paiement en ligne).',
        });
      }
      return res.json(row);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  }));

  r.patch('/reservations/:id', asyncHandler(async (req, res) => {
    try {
      const id = req.params.id;
      const status = req.body && req.body.status;
      const allowed = ['pending', 'confirmed', 'cancelled'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Statut invalide (pending, confirmed, cancelled).' });
      }
      const row = await store.updateReservationStatus(id, status);
      if (!row) return res.status(404).json({ error: 'Réservation introuvable.' });
      return res.json(row);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  }));

  r.post('/cars', asyncHandler(async (req, res) => {
    try {
      const b = req.body || {};
      const image_url = typeof b.image_url === 'string' ? b.image_url.trim() : '';
      const name = typeof b.name === 'string' ? b.name.trim() : '';
      const brand = typeof b.brand === 'string' ? b.brand.trim().toLowerCase() : '';
      const fuel = typeof b.fuel === 'string' ? b.fuel.trim() : '';
      const price = Number(b.price_per_day);
      const seats = Number.parseInt(b.seats, 10);
      const year = Number.parseInt(b.year, 10);
      const km = Number.parseInt(b.km, 10);
      if (!image_url || !name || !brand || !fuel) {
        return res.status(400).json({ error: 'Champs texte requis : image_url, name, brand, fuel.' });
      }
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ error: 'price_per_day invalide.' });
      }
      if (!Number.isInteger(seats) || seats < 1) return res.status(400).json({ error: 'seats invalide.' });
      if (!Number.isInteger(year) || year < 1950 || year > 2100) {
        return res.status(400).json({ error: 'year invalide.' });
      }
      if (!Number.isInteger(km) || km < 0) return res.status(400).json({ error: 'km invalide.' });
      const row = await store.createCar({
        image_url,
        name,
        brand,
        price_per_day: price,
        fuel,
        seats,
        year,
        km,
      });
      return res.status(201).json(row);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  }));

  r.put('/cars/:id', asyncHandler(async (req, res) => {
    try {
      const id = req.params.id;
      const b = req.body || {};
      const row = await store.carById(id);
      if (!row) return res.status(404).json({ error: 'Véhicule introuvable.' });
      const image_url = typeof b.image_url === 'string' ? b.image_url.trim() : row.image_url;
      const name = typeof b.name === 'string' ? b.name.trim() : row.name;
      const brand = typeof b.brand === 'string' ? b.brand.trim().toLowerCase() : row.brand;
      const fuel = typeof b.fuel === 'string' ? b.fuel.trim() : row.fuel;
      const price_per_day = b.price_per_day != null ? Number(b.price_per_day) : row.price_per_day;
      const seats = b.seats != null ? Number.parseInt(b.seats, 10) : row.seats;
      const year = b.year != null ? Number.parseInt(b.year, 10) : row.year;
      const km = b.km != null ? Number.parseInt(b.km, 10) : row.km;
      if (!Number.isFinite(price_per_day) || price_per_day <= 0 || !Number.isInteger(seats) || seats < 1) {
        return res.status(400).json({ error: 'Données numériques invalides.' });
      }
      const updated = await store.updateCar(id, {
        image_url,
        name,
        brand,
        fuel,
        price_per_day,
        seats,
        year,
        km,
      });
      return res.json(updated);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  });

  r.delete('/cars/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const ok = await store.deleteCar(id);
      if (!ok) return res.status(404).json({ error: 'Véhicule introuvable.' });
      return res.json({ ok: true });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  }));

  return r;
}

module.exports = { createAdminRouter };
