const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { requireAuth, requireAdmin } = require('../server/middleware/auth');

function mockRes() {
  return {
    statusCode: 200,
    payload: null,
    status(n) {
      this.statusCode = n;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

describe('requireAuth', () => {
  test('401 sans session', () => {
    const req = {};
    const res = mockRes();
    let nextCalled = false;
    requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.payload.error, 'Connexion requise.');
  });

  test('401 session sans userId', () => {
    const req = { session: {} };
    const res = mockRes();
    let nextCalled = false;
    requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  });

  test('appelle next quand userId présent', () => {
    const req = { session: { userId: 1 } };
    const res = mockRes();
    let nextCalled = false;
    requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  });
});

describe('requireAdmin', () => {
  test('401 sans connexion', () => {
    const req = { session: {} };
    const res = mockRes();
    requireAdmin(req, res, () => assert.fail('next ne doit pas être appelé'));
    assert.equal(res.statusCode, 401);
  });

  test('403 utilisateur non admin', () => {
    const req = { session: { userId: 1, role: 'user' } };
    const res = mockRes();
    requireAdmin(req, res, () => assert.fail('next ne doit pas être appelé'));
    assert.equal(res.statusCode, 403);
    assert.match(res.payload.error, /administrateur/);
  });

  test('next pour admin', () => {
    const req = { session: { userId: 1, role: 'admin' } };
    const res = mockRes();
    let nextCalled = false;
    requireAdmin(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });
});
