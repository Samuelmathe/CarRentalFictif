/**
 * Nombre de jours facturés (début et fin inclus), en UTC sur chaînes AAAA-MM-JJ.
 */
function inclusiveRentalDays(startStr, endStr) {
  const [ys, ms, ds] = String(startStr).split('-').map(Number);
  const [ye, me, de] = String(endStr).split('-').map(Number);
  const s = Date.UTC(ys, ms - 1, ds);
  const e = Date.UTC(ye, me - 1, de);
  const diff = Math.round((e - s) / 86400000) + 1;
  return Math.max(1, diff);
}

/**
 * Montant total en centimes (EUR), calculé côté serveur uniquement.
 */
function rentalTotalCents(pricePerDay, startStr, endStr) {
  const days = inclusiveRentalDays(startStr, endStr);
  const totalEuro = Number(pricePerDay) * days;
  return Math.max(50, Math.round(totalEuro * 100)); // min 0,50 € (Stripe)
}

module.exports = { inclusiveRentalDays, rentalTotalCents };
