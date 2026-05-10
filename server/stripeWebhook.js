/**
 * Webhook Stripe : ne jamais faire confiance au corps sans vérification de signature.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function handleStripeWebhook(req, res, store, stripe, webhookSecret) {
  try {
    if (!stripe || !webhookSecret) {
      return res.status(503).send('Stripe webhook non configuré.');
    }

    const sig = req.headers['stripe-signature'];
    if (!sig || !Buffer.isBuffer(req.body)) {
      return res.status(400).send('Requête invalide.');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Stripe signature:', err.message);
      return res.status(400).send('Requête webhook invalide.');
    }

    if (event.type === 'checkout.session.completed') {
      try {
        const session = event.data.object;
        const sessionId = session.id;
        const paid = session.payment_status === 'paid';
        if (paid) {
          const ok = await store.markReservationPaidFromStripeSession(sessionId);
          if (!ok) {
            // eslint-disable-next-line no-console
            console.warn('Stripe webhook: aucune réservation pour session', sessionId);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        if (!res.headersSent) return res.status(500).send('Erreur serveur.');
        return;
      }
    }

    return res.json({ received: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (!res.headersSent) return res.status(500).send('Erreur serveur.');
  }
}

module.exports = { handleStripeWebhook };
