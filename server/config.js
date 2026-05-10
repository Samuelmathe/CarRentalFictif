const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = (process.env.MONGODB_URI || '').trim();
const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
const stripeWebhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
const publicAppUrl = (process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');

module.exports = {
  port: Number.parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'dev-change-me-insecure',
  mongoUri,
  useMongo: Boolean(mongoUri),
  trustProxy: process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true',
  stripeSecretKey,
  stripeWebhookSecret,
  publicAppUrl,
  stripeEnabled: Boolean(stripeSecretKey),
};
