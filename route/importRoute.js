const express = require('express');
const router = express.Router();
const {auth} = require("../middleware/authorization")
const multer = require('multer');
const importFromExcel = require('../controllers/importController');
const storage = multer.memoryStorage();  
const upload = multer({ storage });
 
  

// Import data from Excel
router.post("/student",  auth(["Admin", "Instructor","Manager","HR"]), upload.single("file"), importFromExcel);

module.exports = router;

 