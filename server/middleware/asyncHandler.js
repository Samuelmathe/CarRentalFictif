/**
 * Express 4 : enveloppe une route async pour transmettre les rejets à next(err).
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    try {
      const out = fn(req, res, next);
      if (out != null && typeof out.then === 'function' && typeof out.catch === 'function') {
        out.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { asyncHandler };
