const express = require("express");
const {auth} = require("../middleware/authorization")
const { deleteAll, deleteFile }   = require("../controllers/deleteController");
 const router = express.Router();
 

// Delete All Records (Protected route)
router.post("/all", auth(["Admin","Manager","HR"]), deleteAll);

router.post('/file', auth(["Admin","Manager","HR"]), deleteFile)

module.exports = router;
