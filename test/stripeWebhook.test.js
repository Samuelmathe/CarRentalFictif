const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { handleStripeWebhook } = require('../server/stripeWebhook');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    jsonBody: null,
    status(n) {
      this.statusCode = n;
      return this;
    },
    send(s) {
      this.body = s;
      return this;
    },
    json(o) {
      this.jsonBody = o;
      return this;
    },
  };
}

describe('handleStripeWebhook', () => {
  test('503 si stripe ou secret absent', async () => {
    const req = { headers: { 'stripe-signature': 'x' }, body: Buffer.from('{}') };
    const res = createRes();
    await handleStripeWebhook(req, res, {}, null, '');
    assert.equal(res.statusCode, 503);
  });

  test('400 sans en-tête stripe-signature', async () => {
    const stripe = { webhooks: { constructEvent: () => ({ type: 'ping' }) } };
    const req = { headers: {}, body: Buffer.from('{}') };
    const res = createRes();
    await handleStripeWebhook(req, res, {}, stripe, 'whsec_test');
    assert.equal(res.statusCode, 400);
  });

  test('400 si corps n’est pas un Buffer (raw body requis)', async () => {
    const stripe = { webhooks: { constructEvent: () => ({}) } };
    const req = { headers: { 'stripe-signature': 'sig' }, body: '{}' };
    const res = createRes();
    await handleStripeWebhook(req, res, {}, stripe, 'whsec_test');
    assert.equal(res.statusCode, 400);
  });

  test('400 si signature invalide', async () => {
    const stripe = {
      webhooks: {
        constructEvent() {
          throw new Error('Invalid signature');
        },
      },
    };
    const req = { headers: { 'stripe-signature': 'bad' }, body: Buffer.from('{}') };
    const res = createRes();
    await handleStripeWebhook(req, res, {}, stripe, 'whsec_test');
    assert.equal(res.statusCode, 400);
    assert.equal(String(res.body), 'Requête webhook invalide.');
  });

  test('checkout.session.completed payé appelle le store', async () => {
    let marked = false;
    const store = {
      async markReservationPaidFromStripeSession(sessionId) {
        assert.equal(sessionId, 'cs_test_1');
        marked = true;
        return true;
      },
    };
    const stripe = {
      webhooks: {
        constructEvent() {
          return {
            type: 'checkout.session.completed',
            data: {
              object: { id: 'cs_test_1', payment_status: 'paid' },
            },
          };
        },
      },
    };
    const req = { headers: { 'stripe-signature': 'ok' }, body: Buffer.from('{}') };
    const res = createRes();
    await handleStripeWebhook(req, res, store, stripe, 'whsec_test');
    assert.equal(marked, true);
    assert.deepEqual(res.jsonBody, { received: true });
  });
});
