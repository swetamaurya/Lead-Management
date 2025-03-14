const { Lead } = require("../model/leadModel");
const fs = require("fs-extra");
const multer = require('multer');
const storage = multer.memoryStorage(); // Store in memory for simple processing
const upload = multer({ storage });
const axios = require("axios");
const { User } = require("../model/userModel");
 
async function getNextSeqValue(seqName) {
    const SeqDoc = await Sequence.findOneAndUpdate(
      { seqName },
      { $inc: { seqValue: 1 } },
      { new: true, upsert: true }
    );
    const SeqNumber = SeqDoc.seqValue.toString().padStart(6, '0'); 
    return `LEAD-${SeqNumber}`;
  }
  
  const uploads = multer({ dest: "uploads/" });
  
 
exports.createLead = async (req, res) => {
  try {
    const leadData = req.body; // No need for `{ ...leadData }`, just use `req.body`

    // Create a new lead
    const newLead = new Lead(leadData);
    await newLead.save();

    res.status(201).json({ message: "Lead created successfully!", lead: newLead });
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
};

 
exports.getAllLeads = async (req, res) => {
  try {
    const { roles, _id } = req.user; // Extract user role and ID from authentication middleware
    const { page , limit } = req.query; // Pagination parameters with defaults

    // Build query based on roles
    let query = {};
    if (roles === "Employee") {
      // Employees can only view their assigned leads
      query = { assignedTo: _id };
    } else if (roles === "Manager" || roles === "Admin") {
      // Managers and Admins can view all leads
      query = {};
    } else {
      // Restrict other roles
      return res.status(403).json({ message: "Access denied: Unauthorized role." });
    }

    // Pagination logic
    const skip = (parseInt(page) - 1) * (parseInt(limit) || 0); // Records to skip

    // Query leads
    let leads = await Lead.find(query)
      .populate("assignedTo", "name email userId roles") // Populate assigned user's details
      .populate({
        path: 'assignedBy',
        select: 'name email roles' // Populate assignedBy field with user details
    })
      .skip(skip)
      .limit(limit ? parseInt(limit) : 0)
      .sort({ _id: -1 })
      .lean();

      const formattedLeads = leads.map((lead) => ({
        ...lead,
        callInfo: lead.callInfo.map((info) => ({
          CreatedBy: info.createdByFollowUp,
          Date: info.date,
          NextFollowUp: info.nextFollowUpdate,
          Remark: info.remark,
          Status: info.status
        }))
      }));

    // Total count of leads
    const totalLeads = await Lead.countDocuments(query);
    const totalPages = limit ? Math.ceil(totalLeads / parseInt(limit)) : 1;

    return res.status(200).json({
      message: "Leads fetched successfully!",
      data: formattedLeads,
      pagination: {
        totalLeads,
        totalPages,
        currentPage: parseInt(page),
        perPage: limit ? parseInt(limit) : totalLeads,
      },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
};


exports.getSingleLead = async (req, res) => {
    const { name } = req.user
    try {
      const { id } = req.query;
  
      const lead = await Lead.findById(id)
    .populate('assignedTo', 'name email roles')
    .populate({
      path: 'assignedBy',
      select: 'name email roles' // Populate assignedBy field with user details
  }) 
     
    
  
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found.' });
      }
      
   // Sort the `callInfo` array by `_id` in descending order
   if (lead.callInfo) {
    lead.callInfo.sort((a, b) => b._id.toString().localeCompare(a._id.toString()));
  }
  
  
      res.status(200).json({ message: 'Lead fetched successfully!', lead , name:name });
    } catch (error) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
  }


exports.updateLead = async (req, res) => {
    try {
      
      const {id ,...updateData} = req.body;
  // console.log(req.body)
      const updatedLead = await Lead.findByIdAndUpdate(id,  { ...updateData, updatedAt: new Date() } )// Automatically update the `updatedAt` field
   
   
  
      if (!updatedLead) {
        return res.status(404).json({ message: 'Lead not found.' });
      }
  
      res.status(200).json({ message: 'Lead updated successfully!', lead: updatedLead });
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
  }


exports.followUpCreate =  async(req,res)=>{
    try {
      const {name} = req.user
      // console.log(req.user)
    
      const { _id, callInfo } = req.body
      // console.log(req.body)
    if(!_id || !callInfo){
      return res.status(400).json({msg:'Id and CallInfo is Required'})
    }
    const lead = await Lead.findById(_id);
    if(!lead){
      return res.status(400).json({msg:'Id is not matched'})
    }
    lead.callInfo.push(...callInfo);
    await lead.save();
    return res.status(200).json({
      msg:'Info are created successfully',
      lead:lead,
      // createdBy : name
    })
    } catch (error) {
      console.error('Error adding follow-up call info:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
    }


exports.updateCallDeatils = async (req, res) => {
    const { leadId, callId, date, nextFollowUpdate, remark, status } = req.body;
    if (!leadId || !callId) {
      return res.status(400).json({ message: "Lead ID and Call ID are required." });
    }
    try {
      // Update the specific call in the callInfo array
      const result = await Lead.updateOne(
        { _id: leadId, "callInfo._id": callId },
        {
          $set: {
            "callInfo.$.date": date,
            "callInfo.$.nextFollowUpdate": nextFollowUpdate,
            "callInfo.$.remark": remark,
            "callInfo.$.status": status,
          },
        }
      );
      if (result.nModified === 0) {
        return res
          .status(404)
          .json({ message: "Call entry not found or no changes made." });
      }
      // Retrieve the updated call entry
      const updatedLead = await Lead.findById(leadId, {
        callInfo: { $elemMatch: { _id: callId } }, // Get the specific updated callInfo
      }).sort({ 'callInfo._id': -1 });;
      if (!updatedLead || updatedLead.callInfo.length === 0) {
        return res.status(404).json({
          message: "Updated call entry not found after update.",
        });
      }
      res.json({
        message: "Call updated successfully!",
        updatedCall: updatedLead.callInfo[0], // Send the updated call entry
      });
    } catch (error) {
      console.error("Error updating call:", error);
      res
        .status(500)
        .json({ message: "An error occurred while updating the call." });
    }
  }      


  exports.assingedLead = async (req, res) => {
    try {
        const { leadIds, userId, assignedBy } = req.body;

        if (!leadIds || !userId || !assignedBy) {
            return res.status(400).json({ message: "Missing required fields: leadIds, userId, assignedBy" });
        }

        // Assign leads to the user and store `assignedBy`
        await Lead.updateMany(
            { _id: { $in: leadIds } },
            { $set: { assignedTo: userId, assignedBy: assignedBy } }
        );

        // Add assigned leads to the user profile
        await User.findOneAndUpdate(
            { _id: userId },
            { 
                $addToSet: { assigned: { $each: leadIds } } // Ensure assigned leads are stored
            },
            { new: true }
        );

        // **Also store in Admin's profile** (who assigned the lead)
        await User.findOneAndUpdate(
            { _id: assignedBy }, // Find the Admin
            { 
                $addToSet: { assigned: { $each: leadIds } } // Store leads in Admin profile too
            },
            { new: true }
        );

        return res.status(200).json({ message: "Leads assigned successfully." });

    } catch (error) {
        console.error("Error assigning leads:", error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

  



exports.webSiteLead = async (req = null, res = null) => { 
  try {
      // Ensure "Yugo" leads are deleted first
      await Lead.deleteMany({ make: "Yugo" });
      // console.log(`Deleted all "Yugo" leads from the database.`);

      const [zingerResponse, napResponse] = await Promise.all([
          axios.get("https://zingercarparts.com/api/get/users"),
          axios.get("https://napautopart.com/get_forms.php")
      ]);

      if (!zingerResponse.data?.result || !Array.isArray(zingerResponse.data.result)) {
          throw new Error("Invalid API response structure from Zinger Car Parts");
      }
      if (!napResponse.data?.result || !Array.isArray(napResponse.data.result)) {
          throw new Error("Invalid API response structure from Nap Auto Parts");
      }

      const apiLeads = [...zingerResponse.data.result, ...napResponse.data.result];

      // Process each lead to check for new leads
      const newLeads = [];

      for (const lead of apiLeads) {
          if (lead.make && lead.make.trim().toLowerCase() === "yugo") {
              // console.log(`Skipping lead with make: "${lead.make}"`); // Debug log
              continue; // Skip this iteration
          }

          // Check if an exact duplicate exists
          const existingLead = await Lead.findOne({
              email: lead.email,
              mobile_number: lead.mobile_number,
              name: lead.name,
              year: lead.year,
              make: lead.make,
              model: lead.model,
              part: lead.part,
              created_at: lead.created_at
          }).sort({ _id: -1 });

          if (!existingLead) {
              newLeads.push(lead);
          }
      }

      // Insert only new leads (double-checking "Yugo" again)
      if (newLeads.length > 0) {
          const filteredLeads = newLeads.filter(lead => lead.make.toLowerCase() !== "yugo");
          
          if (filteredLeads.length > 0) {
              await Lead.insertMany(filteredLeads);
          }

          // Fetch and return the newly inserted leads (excluding "Yugo")
          const insertedLeads = await Lead.find({ make: { $ne: "Yugo" } })
              .sort({ _id: -1 })
              .limit(filteredLeads.length);

          return res
              ? res.status(200).json({ message: "Leads updated successfully", insertedLeads })
              : { message: "Leads updated successfully", insertedLeads };
      } else {
          return res
              ? res.status(200).json({ message: "No new Leads to update" })
              : { message: "No new Leads to update" };
      }
  } catch (error) {
      console.error(`[${new Date().toISOString()}] - Error updating Leads:`, error);
      return res
          ? res.status(500).json({ message: "Error updating Leads", error: error.message })
          : { message: "Error updating Leads", error: error.message };
  }
};





  
   
