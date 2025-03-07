const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "gallery/"); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}`);
  },
});

const gallery = multer({ storage });
module.exports = gallery;
