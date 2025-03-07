const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String  },
   },
  { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema);

categorySchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
  });
 
 
module.exports =  Category 
