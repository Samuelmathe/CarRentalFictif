const bcrypt = require('bcryptjs');
const { Router } = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');

const SALT_ROUNDS = 10;

function createAuthRouter(store) {
  const r = Router();

  r.post('/register', asyncHandler(async (req, res) => {
    try {
      const { email, password, display_name } = req.body || {};
      const mail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const name = typeof display_name === 'string' ? display_name.trim() : '';
      if (!mail || !mail.includes('@')) {
        return res.status(400).json({ error: 'E-mail invalide.' });
      }
      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Mot de passe : au moins 8 caractères.' });
      }
      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Nom affiché requis (2 caractères min.).' });
      }
      const exists = await store.findUserByEmail(mail);
      if (exists) {
        return res.status(409).json({ error: 'Cet e-mail est déjà utilisé.' });
      }
      const hash = bcrypt.hashSync(password, SALT_ROUNDS);
      const user = await store.createUser({
        email: mail,
        password_hash: hash,
        display_name: name,
        role: 'user',
      });
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.displayName = user.display_name;
      req.session.role = user.role;
      return res.status(201).json({
        user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  }));

  r.post('/login', asyncHandler(async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const mail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!mail || !password) {
        return res.status(400).json({ error: 'E-mail et mot de passe requis.' });
      }
      const user = await store.findUserByEmail(mail);
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Identifiants incorrects.' });
      }
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.displayName = user.display_name;
      req.session.role = user.role;
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  }));

  r.post('/logout', (req, res, next) => {
    try {
      req.session.destroy((err) => {
        try {
          if (err) return res.status(500).json({ error: 'Impossible de déconnecter.' });
          res.clearCookie('autoloc.sid');
          return res.json({ ok: true });
        } catch (e) {
          return next(e);
        }
      });
    } catch (e) {
      next(e);
    }
  });

  r.get('/me', (req, res, next) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.json({ user: null });
      }
      return res.json({
        user: {
          id: req.session.userId,
          email: req.session.email,
          display_name: req.session.displayName,
          role: req.session.role,
        },
      });
    } catch (e) {
      next(e);
    }
  });

  return r;
}

module.exports = { createAuthRouter };
