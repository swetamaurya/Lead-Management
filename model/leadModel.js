const mongoose = require('mongoose');
const moment = require('moment');

const sequenceSchema = new mongoose.Schema({
  seqName: { type: String, unique: true },
  seqValue: { type: Number, default: 0 },
});

const Sequence = mongoose.model('SequenceLead', sequenceSchema);

async function getNextSeqValue(seqName) {
  const SeqDoc = await Sequence.findOneAndUpdate(
    { seqName },
    { $inc: { seqValue: 1 } },
    { new: true, upsert: true }
  );
  const SeqNumber = SeqDoc.seqValue.toString().padStart(6, '0');
  return `LEAD-${SeqNumber}`;
}

const leadSchema = new mongoose.Schema({
  leadId: { type: String },
  form_type: { type: String },
  page_url: { type: String },
  referrer_url: { type: String },
  name: { type: String },
  mobile_number: { type: String },
  year: { type: String },
  make: { type: String },
  model: { type: String },
  part: { type: String },
  email: { type: String },
  callStatus: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: String },
  date: {
    type: String,
  },
  callInfo: [
    {
      createdByFollowUp: String,
      date: String,
      nextFollowUpdate: String,
      remark: String,
      status: String,
    },
  ],
  saleStatus: {
    type: String,
    default: 'Ready To Start',
  },

 
  created_at: {
    type: String,
    default: () => moment().format('DD-MM-YYYY hh:mm A'),
  },
  updated_at: {
    type: String,
    default: () => moment().format('DD-MM-YYYY hh:mm A'),
  },
});
 
leadSchema.pre('save', async function (next) {
  if (!this.leadId) {
    this.leadId = await getNextSeqValue('leadId');
  }
  next();
});

 
leadSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updated_at: moment().format('DD-MM-YYYY hh:mm A') });
  next();
});

const Lead = mongoose.model('Lead', leadSchema);

module.exports = { Lead, Sequence };
