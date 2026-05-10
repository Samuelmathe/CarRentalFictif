/**
 * Réponse 500 générique (pas de détail d’exception côté client).
 */
function errorHandler(err, req, res, _next) {
  // eslint-disable-next-line no-console
  console.error(err);
  if (res.headersSent) return;
  const api = typeof req.path === 'string' && req.path.startsWith('/api');
  if (api) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
  return res.status(500).type('text').send('Erreur serveur.');
}

module.exports = { errorHandler };
