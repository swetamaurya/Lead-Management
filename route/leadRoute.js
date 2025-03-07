const express = require('express');
const router = express.Router();
const {Lead ,Sequence} = require('../model/leadModel');
const {auth} = require('../middleware/authorization');
const { createLead ,getAllLeads ,getSingleLead,updateLead ,assingedLead, followUpCreate,updateCallDeatils,webSiteLead} = require('../controllers/leadControllers')
// const excelToJson = require("convert-excel-to-json");

 
// Create a new lead
 router.post('/post', auth(["Admin","Manager","Employee"]), createLead)

// Get all leads
router.get('/getAll', auth(["Admin","Manager","Employee"]),getAllLeads)

// Get a single lead by ID
router.get('/get', auth(["Admin","Manager","Employee"]), getSingleLead)

// Update a lead by ID
router.post('/update', auth(["Admin","Manager","Employee"]), updateLead)

router.post("/assinged", auth(["Admin","Manager","Employee"]),assingedLead)
 
router.post("/followUp/post",auth(["Admin","Manager","Employee"]), followUpCreate)


router.post("/update-call", auth(["Admin","Manager","Employee"]), updateCallDeatils)

router.get("/webSiteLead",  webSiteLead);

module.exports = router;
