const mongoose = require('mongoose');
const moment = require('moment');

// Sequence schema for generating sequential IDs based on roles or asset type
const sequenceSchema = new mongoose.Schema({
  seqName: { type: String, required: true, unique: true },
  seqValue: { type: Number, default: 0 },
});

const Sequence = mongoose.model('Sequence', sequenceSchema);

// Function to generate sequential IDs for users based on roles or assets
async function getNextSequenceValue(type) {
  const prefixMap = {
    Admin: 'ADM',
    Employee: 'EMP',
    Supervisor: 'SPV',
    HR: 'HR',
    Manager: 'MMG',
  };

  const prefix = prefixMap[type] || 'USR';

  const sequenceDoc = await Sequence.findOneAndUpdate(
    { seqName: type },
    { $inc: { seqValue: 1 } },
    { new: true, upsert: true }
  );

  const sequenceNumber = sequenceDoc.seqValue.toString().padStart(4, '0');
  return `${prefix}-${sequenceNumber}`;
}

// User schema with primary and secondary contact details, and timestamps
const userSchema = new mongoose.Schema(
  {
    userId: { type: String }, // Auto-generated unique ID
    name: { type: String },
    email: { type: String },
    password: { type: String },
    mobile: { type: String },
    roles: { type: String },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    assigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
    image: { type: String },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } } // Correct timestamp placement
);

// Middleware to generate unique userId based on role before saving
userSchema.pre('save', async function (next) {
  if (!this.userId && this.roles) {
    try {
      this.userId = await getNextSequenceValue(this.roles);
    } catch (error) {
      return next(error);
    }
  } else if (!this.roles) {
    return next(new Error('roles is required to generate userId'));
  }
  next();
});

// Ensure updatedAt is changed on update
userSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: moment().format("DD-MM-YYYY HH:mm") });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = { User, Sequence };
