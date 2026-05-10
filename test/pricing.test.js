const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { inclusiveRentalDays, rentalTotalCents } = require('../server/lib/pricing');

describe('inclusiveRentalDays', () => {
  test('un seul jour facturé quand début = fin', () => {
    assert.equal(inclusiveRentalDays('2025-01-10', '2025-01-10'), 1);
  });

  test('deux jours pour une location sur deux dates consécutives', () => {
    assert.equal(inclusiveRentalDays('2025-01-10', '2025-01-11'), 2);
  });

  test('sept jours sur une semaine calendaire', () => {
    assert.equal(inclusiveRentalDays('2025-01-01', '2025-01-07'), 7);
  });

  test('UTC : pas de décalage DST sur chaînes AAAA-MM-JJ', () => {
    assert.equal(inclusiveRentalDays('2025-06-01', '2025-06-01'), 1);
  });
});

describe('rentalTotalCents', () => {
  test('prix journalier × jours en centimes', () => {
    assert.equal(rentalTotalCents(10, '2025-01-01', '2025-01-01'), 1000);
  });

  test('minimum 50 centimes (Stripe)', () => {
    assert.equal(rentalTotalCents(0.001, '2025-01-01', '2025-01-01'), 50);
  });

  test('plusieurs jours avec décimales arrondies', () => {
    const cents = rentalTotalCents(33.33, '2025-01-01', '2025-01-03');
    assert.equal(cents, Math.round(33.33 * 3 * 100));
  });
});
