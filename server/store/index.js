const config = require('../config');
const { createSqliteStore } = require('./sqliteStore');
const { createMongoStore } = require('./mongoStore');

async function createStore() {
  if (config.useMongo) {
    return createMongoStore(config.mongoUri);
  }
  const { initDb } = require('../db');
  return createSqliteStore(initDb());
}

module.exports = { createStore };
