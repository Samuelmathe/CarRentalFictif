const path = require('path');
const express = require('express');
const session = require('express-session');
const Stripe = require('stripe');
const config = require('./config');
const { createStore } = require('./store');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { asyncHandler } = require('./middleware/asyncHandler');
const { errorHandler } = require('./middleware/errorHandler');
const { createAuthRouter } = require('./routes/auth');
const { createAdminRouter } = require('./routes/admin');
const { rentalTotalCents } = require('./lib/pricing');
const { handleStripeWebhook } = require('./stripeWebhook');

async function main() {
  const store = await createStore();
  const app = express();

  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  const stripe = config.stripeEnabled ? new Stripe(config.stripeSecretKey) : null;

  if (stripe && config.stripeWebhookSecret) {
    app.post(
      '/api/stripe/webhook',
      express.raw({ type: 'application/json' }),
      asyncHandler(async (req, res) => {
        await handleStripeWebhook(req, res, store, stripe, config.stripeWebhookSecret);
      })
    );
  }

  app.use(express.json());
  app.use(
    session({
      name: 'autoloc.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
      },
    })
  );

  app.get('/api/health', (req, res, next) => {
    try {
      res.json({
        ok: true,
        service: 'autoloc-api',
        data: store.mode === 'mongo' ? 'mongodb' : 'sqlite',
        stripe: Boolean(stripe),
      });
    } catch (e) {
      next(e);
    }
  });

  app.get(
    '/api/stripe/session-status',
    asyncHandler(async (req, res) => {
      try {
        const sid = typeof req.query.session_id === 'string' ? req.query.session_id.trim() : '';
        if (!sid || !stripe) {
          return res.status(400).json({ error: 'Paramètre invalide ou Stripe non configuré.' });
        }
        try {
          const s = await stripe.checkout.sessions.retrieve(sid);
          return res.json({
            payment_status: s.payment_status,
            paid: s.payment_status === 'paid',
          });
        } catch {
          return res.status(400).json({ error: 'Session introuvable.' });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        return res.status(500).json({ error: 'Erreur serveur.' });
      }
    })
  );

  app.use('/api/auth', createAuthRouter(store));

  app.get('/api/cars', asyncHandler(async (_req, res) => {
    try {
      const rows = await store.carsList();
      res.json(rows);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      res.status(500).json({ error: 'Impossible de lire les véhicules.' });
    }
  }));

  app.get('/api/cars/:id/availability', asyncHandler(async (req, res) => {
    try {
      const car = await store.carById(req.params.id);
      if (!car) return res.status(404).json({ error: 'Véhicule introuvable.' });
      const periods = await store.getBlockingPeriodsForCar(req.params.id);
      return res.json({ periods });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  }));

  app.get('/api/cars/:id', asyncHandler(async (req, res) => {
    try {
      const row = await store.carById(req.params.id);
      if (!row) return res.status(404).json({ error: 'Véhicule introuvable.' });
      return res.json(row);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  }));

  app.get('/api/me/reservations', requireAuth, asyncHandler(async (req, res) => {
    try {
      const rows = await store.reservationsForUser(req.session.userId);
      res.json(rows);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      res.status(500).json({ error: 'Impossible de lire vos réservations.' });
    }
  }));

  app.post('/api/reservations', asyncHandler(async (req, res) => {
    try {
      const { car_id, customer_name, email, start_date, end_date, payment_method: payRaw } =
        req.body || {};
      const cid = car_id != null ? String(car_id).trim() : '';
      if (!cid) {
        return res.status(400).json({ error: 'car_id requis.' });
      }

      const payment_method = payRaw === 'stripe' ? 'stripe' : 'on_site';

      let custName = typeof customer_name === 'string' ? customer_name.trim() : '';
      let custEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      let userId = null;

      if (req.session && req.session.userId) {
        userId = req.session.userId;
        const u = await store.findUserById(userId);
        if (u) {
          if (!custName) custName = u.display_name;
          if (!custEmail) custEmail = u.email;
        }
      }

      if (!custName) {
        return res.status(400).json({ error: 'customer_name requis (ou connectez-vous).' });
      }
      if (!custEmail || !custEmail.includes('@')) {
        return res.status(400).json({ error: 'email valide requis (ou connectez-vous).' });
      }
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'start_date et end_date requis (format AAAA-MM-JJ).' });
      }
      if (String(start_date) > String(end_date)) {
        return res.status(400).json({ error: 'La date de fin doit être le même jour ou après le début.' });
      }
      const car = await store.carById(cid);
      if (!car) return res.status(404).json({ error: 'Véhicule introuvable.' });

      const overlap = await store.countOverlappingReservations(cid, start_date, end_date);
      if (overlap > 0) {
        return res.status(409).json({
          error: 'Ces dates chevauchent une réservation déjà enregistrée pour ce véhicule.',
        });
      }

      const amountCents = rentalTotalCents(car.price_per_day, start_date, end_date);

      if (payment_method === 'on_site') {
        const info = await store.createReservation({
          car_id: cid,
          customer_name: custName,
          email: custEmail,
          start_date,
          end_date,
          user_id: userId,
          payment_method: 'on_site',
          payment_status: 'awaiting_physical',
          amount_cents: amountCents,
          stripe_checkout_session_id: null,
        });
        return res.status(201).json({
          id: info.id,
          payment_method: 'on_site',
          payment_status: 'awaiting_physical',
          amount_cents: amountCents,
          message:
            'Réservation enregistrée. Paiement sur place : un administrateur confirmera le règlement.',
        });
      }

      if (!stripe) {
        return res.status(503).json({
          error: 'Paiement en ligne indisponible (configurez STRIPE_SECRET_KEY dans .env).',
        });
      }
      if (!config.publicAppUrl) {
        return res.status(503).json({
          error: 'Configurez PUBLIC_APP_URL (URL publique du site) pour les retours Stripe.',
        });
      }

      const info = await store.createReservation({
        car_id: cid,
        customer_name: custName,
        email: custEmail,
        start_date,
        end_date,
        user_id: userId,
        payment_method: 'stripe',
        payment_status: 'unpaid',
        amount_cents: amountCents,
        stripe_checkout_session_id: null,
      });

      const successUrl = `${config.publicAppUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${config.publicAppUrl}/payment-cancel.html`;

      const checkoutSession = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          customer_email: custEmail,
          client_reference_id: String(info.id),
          line_items: [
            {
              price_data: {
                currency: 'eur',
                unit_amount: amountCents,
                product_data: {
                  name: `Location — ${car.name}`,
                  description: `${String(start_date)} → ${String(end_date)}`,
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            reservation_id: String(info.id),
            car_id: String(car.id),
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
        { idempotencyKey: `checkout_${String(info.id)}_${amountCents}` }
      );

      await store.updateReservationStripeSession(info.id, checkoutSession.id);

      return res.status(201).json({
        id: info.id,
        checkoutUrl: checkoutSession.url,
        payment_method: 'stripe',
        payment_status: 'unpaid',
        amount_cents: amountCents,
        message: 'Redirection vers Stripe (page sécurisée).',
      });
    } catch (e) {
      if (e && e.message === 'invalid_car') {
        return res.status(400).json({ error: 'Identifiant véhicule invalide.' });
      }
      // eslint-disable-next-line no-console
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
  }));

  app.use('/api/admin', requireAdmin, createAdminRouter(store));

  app.use(errorHandler);

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`AutoLoc (${store.mode}) → http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
