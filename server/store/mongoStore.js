const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { seedCars } = require('../seedCars');

const { Schema } = mongoose;

function toOid(id) {
  if (id == null || id === '') return null;
  const s = String(id).trim();
  if (!/^[a-f0-9]{24}$/i.test(s)) return null;
  try {
    return new mongoose.Types.ObjectId(s);
  } catch {
    return null;
  }
}

function buildSchemas() {
  if (mongoose.models.User) return;

  const userSchema = new Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password_hash: { type: String, required: true },
      display_name: { type: String, required: true },
      role: { type: String, enum: ['user', 'admin'], default: 'user' },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: false } }
  );

  const carSchema = new Schema(
    {
      image_url: { type: String, required: true },
      name: { type: String, required: true },
      brand: { type: String, required: true },
      price_per_day: { type: Number, required: true },
      fuel: { type: String, required: true },
      seats: { type: Number, required: true },
      year: { type: Number, required: true },
      km: { type: Number, required: true },
    },
    { timestamps: false }
  );

  const reservationSchema = new Schema(
    {
      car_id: { type: Schema.Types.ObjectId, ref: 'Car', required: true },
      user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      customer_name: { type: String, required: true },
      email: { type: String, required: true },
      start_date: { type: String, required: true },
      end_date: { type: String, required: true },
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending',
      },
      payment_method: { type: String, enum: ['stripe', 'on_site'], default: 'on_site' },
      payment_status: {
        type: String,
        enum: ['unpaid', 'paid', 'failed', 'awaiting_physical'],
        default: 'paid',
      },
      amount_cents: { type: Number, default: null },
      stripe_checkout_session_id: { type: String, default: null },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: false } }
  );

  mongoose.model('User', userSchema);
  mongoose.model('Car', carSchema);
  mongoose.model('Reservation', reservationSchema);
}

function carDocToRow(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    image_url: o.image_url,
    name: o.name,
    brand: o.brand,
    price_per_day: o.price_per_day,
    fuel: o.fuel,
    seats: o.seats,
    year: o.year,
    km: o.km,
  };
}

function resDocToAdminRow(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const car = o.car_id && typeof o.car_id === 'object' ? o.car_id : {};
  return {
    id: String(o._id),
    car_id: o.car_id && typeof o.car_id === 'object' ? String(o.car_id._id || o.car_id) : String(o.car_id),
    customer_name: o.customer_name,
    email: o.email,
    start_date: o.start_date,
    end_date: o.end_date,
    created_at: o.created_at,
    user_id: o.user_id ? String(o.user_id) : null,
    status: o.status,
    car_name: car.name || '',
    payment_method: o.payment_method || 'on_site',
    payment_status: o.payment_status || 'paid',
    amount_cents: o.amount_cents != null ? o.amount_cents : null,
    stripe_checkout_session_id: o.stripe_checkout_session_id || null,
  };
}

function resDocToUserRow(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const car = o.car_id && typeof o.car_id === 'object' ? o.car_id : {};
  return {
    id: String(o._id),
    car_id: String(o.car_id),
    customer_name: o.customer_name,
    email: o.email,
    start_date: o.start_date,
    end_date: o.end_date,
    created_at: o.created_at,
    user_id: o.user_id ? String(o.user_id) : null,
    status: o.status,
    car_name: car.name || '',
    car_brand: car.brand || '',
    payment_method: o.payment_method || 'on_site',
    payment_status: o.payment_status || 'paid',
    amount_cents: o.amount_cents != null ? o.amount_cents : null,
  };
}

async function seedIfEmpty(User, Car) {
  const carCount = await Car.countDocuments();
  if (carCount === 0) {
    await Car.insertMany(seedCars);
  }
  const adminEmail = 'admin@autoloc.demo';
  const exists = await User.findOne({ email: adminEmail });
  if (!exists) {
    const hash = bcrypt.hashSync('AdminDemo2026!', 10);
    await User.create({
      email: adminEmail,
      password_hash: hash,
      display_name: 'Administrateur démo',
      role: 'admin',
    });
  }
  const Reservation = mongoose.model('Reservation');
  await Reservation.updateMany(
    { payment_method: { $exists: false } },
    { $set: { payment_method: 'on_site', payment_status: 'paid' } }
  );
  await Reservation.updateMany(
    { payment_status: { $exists: false } },
    { $set: { payment_status: 'paid' } }
  );
}

async function createMongoStore(uri) {
  buildSchemas();
  await mongoose.connect(uri);
  const User = mongoose.model('User');
  const Car = mongoose.model('Car');
  const Reservation = mongoose.model('Reservation');
  await seedIfEmpty(User, Car);

  return {
    mode: 'mongo',

    async carsList() {
      const docs = await Car.find().sort({ _id: 1 }).lean();
      return docs.map((d) => carDocToRow({ toObject: () => d, _id: d._id }));
    },

    async carById(id) {
      const oid = toOid(id);
      if (!oid) return null;
      const doc = await Car.findById(oid).lean();
      return doc ? carDocToRow({ toObject: () => doc, _id: doc._id }) : null;
    },

    async createCar(payload) {
      const doc = await Car.create(payload);
      return carDocToRow(doc);
    },

    async updateCar(id, payload) {
      const oid = toOid(id);
      if (!oid) return null;
      const doc = await Car.findByIdAndUpdate(oid, { $set: payload }, { new: true });
      return doc ? carDocToRow(doc) : null;
    },

    async deleteCar(id) {
      const oid = toOid(id);
      if (!oid) return false;
      const exists = await Car.findById(oid);
      if (!exists) return false;
      await Reservation.deleteMany({ car_id: oid });
      await Car.findByIdAndDelete(oid);
      return true;
    },

    async findUserByEmail(email) {
      const doc = await User.findOne({ email: String(email).toLowerCase() }).lean();
      if (!doc) return null;
      return {
        id: String(doc._id),
        _id: doc._id,
        email: doc.email,
        password_hash: doc.password_hash,
        display_name: doc.display_name,
        role: doc.role,
      };
    },

    async findUserById(userId) {
      const oid = toOid(userId);
      if (!oid) return null;
      const doc = await User.findById(oid).lean();
      if (!doc) return null;
      return {
        id: String(doc._id),
        email: doc.email,
        password_hash: doc.password_hash,
        display_name: doc.display_name,
        role: doc.role,
      };
    },

    async createUser({ email, password_hash, display_name, role }) {
      const doc = await User.create({
        email: String(email).toLowerCase(),
        password_hash,
        display_name,
        role: role || 'user',
      });
      return {
        id: String(doc._id),
        email: doc.email,
        display_name: doc.display_name,
        role: doc.role,
      };
    },

    async createReservation({
      car_id,
      customer_name,
      email,
      start_date,
      end_date,
      user_id,
      payment_method,
      payment_status,
      amount_cents,
      stripe_checkout_session_id,
    }) {
      const carOid = toOid(car_id);
      if (!carOid) throw new Error('invalid_car');
      const carOk = await Car.findById(carOid).select('_id').lean();
      if (!carOk) throw new Error('invalid_car');
      const userOid = user_id ? toOid(user_id) : null;
      const doc = await Reservation.create({
        car_id: carOid,
        user_id: userOid,
        customer_name,
        email,
        start_date: String(start_date),
        end_date: String(end_date),
        status: 'pending',
        payment_method,
        payment_status,
        amount_cents: amount_cents ?? null,
        stripe_checkout_session_id: stripe_checkout_session_id ?? null,
      });
      return { id: String(doc._id) };
    },

    async updateReservationStripeSession(reservationId, sessionId) {
      const oid = toOid(reservationId);
      if (!oid) return false;
      const r = await Reservation.updateOne(
        { _id: oid, payment_method: 'stripe' },
        { $set: { stripe_checkout_session_id: String(sessionId) } }
      );
      return r.modifiedCount > 0;
    },

    async markReservationPaidFromStripeSession(sessionId) {
      const r = await Reservation.updateOne(
        {
          stripe_checkout_session_id: String(sessionId),
          payment_method: 'stripe',
          payment_status: 'unpaid',
        },
        { $set: { payment_status: 'paid' } }
      );
      return r.modifiedCount > 0;
    },

    async confirmPhysicalPayment(reservationId) {
      const oid = toOid(reservationId);
      if (!oid) return null;
      const doc = await Reservation.findOneAndUpdate(
        { _id: oid, payment_method: 'on_site', payment_status: 'awaiting_physical' },
        { $set: { payment_status: 'paid' } },
        { new: true }
      )
        .populate('car_id')
        .exec();
      return doc ? resDocToAdminRow(doc) : null;
    },

    async reservationsForUser(userId) {
      const oid = toOid(userId);
      if (!oid) return [];
      const docs = await Reservation.find({ user_id: oid })
        .sort({ created_at: -1 })
        .populate('car_id')
        .exec();
      return docs.map((d) => resDocToUserRow(d));
    },

    async reservationsListAdmin() {
      const docs = await Reservation.find()
        .sort({ created_at: -1 })
        .populate('car_id')
        .exec();
      return docs.map((d) => resDocToAdminRow(d));
    },

    async updateReservationStatus(id, status) {
      const oid = toOid(id);
      if (!oid) return null;
      const doc = await Reservation.findByIdAndUpdate(oid, { $set: { status } }, { new: true })
        .populate('car_id')
        .exec();
      return doc ? resDocToAdminRow(doc) : null;
    },

    async getBlockingPeriodsForCar(carId) {
      const oid = toOid(carId);
      if (!oid) return [];
      const exists = await Car.findById(oid).select('_id').lean();
      if (!exists) return [];
      const docs = await Reservation.find({
        car_id: oid,
        status: { $in: ['pending', 'confirmed'] },
        payment_status: { $nin: ['failed'] },
      })
        .sort({ start_date: 1 })
        .select('start_date end_date status')
        .lean();
      return docs.map((d) => ({
        start_date: d.start_date,
        end_date: d.end_date,
        status: d.status,
      }));
    },

    async countOverlappingReservations(carId, start_date, end_date) {
      const oid = toOid(carId);
      if (!oid) return 0;
      const exists = await Car.findById(oid).select('_id').lean();
      if (!exists) return 0;
      return Reservation.countDocuments({
        car_id: oid,
        status: { $in: ['pending', 'confirmed'] },
        payment_status: { $nin: ['failed'] },
        start_date: { $lte: String(end_date) },
        end_date: { $gte: String(start_date) },
      });
    },
  };
}

module.exports = { createMongoStore };
