function requireAuth(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Connexion requise.' });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireAdmin(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Connexion requise.' });
    }
    if (req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Accès administrateur uniquement.' });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth, requireAdmin };
