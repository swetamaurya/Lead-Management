const { User } = require("../model/userModel");
const { Lead } = require("../model/leadModel");

 
const mongoose = require("mongoose");

const searchModels = async (req, res) => {
    try {
        const { modelName, search, roles, page = 1, pageSize = 10 } = req.body;

        console.log("Received Request Body:", req.body); // Debugging

        // Define valid models
        const validModels = { User, Lead };
        const Model = validModels[modelName];

        if (!Model) {
            return res.status(400).json({ message: "Invalid model name." });
        }

        const pageNumber = Number(page) || 1;
        const pageSizeNumber = Number(pageSize) || 10;

        // Fields that should use regex-based searching
        const searchableFields = [
            "leadId",
            "form_type",
            "page_url",
            "referrer_url",
            "name",
            "mobile_number",
            "make",
            "part",
            "model",
            "email",
            "callStatus",
            "year",
            "date","saleStatus"
        ];

        // **Fix: Ensure `search` is a valid non-empty string**
        let searchQuery = {};

        // if (roles && Array.isArray(roles) && roles.length > 0) {
        //     searchQuery.roles = { $in: roles };
        // }

        if (search && typeof search === "string" && search.trim().length > 0) {
            searchQuery.$or = searchableFields.map((field) => ({
                [field]: { $regex: search.trim(), $options: "i" }, // Case-insensitive search
            }));
        }

        console.log("Generated Search Query:", JSON.stringify(searchQuery, null, 2)); // Debugging

        const skip = (pageNumber - 1) * pageSizeNumber;

        // Base query
        let query = Model.find(searchQuery)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(pageSizeNumber);

        // Populate `assignedTo` if model is `Lead`
        if (modelName === "Lead") {
            query = query.populate("assignedTo", "name email roles");
        }

        // Execute query and transform data
        const data = await query.lean();
        const totalCount = await Model.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalCount / pageSizeNumber);

        // Process and return the response
        const processedData = data.map((item) => ({
            ...item,
            assignedToNames: item.assignedTo?.name || "-", // Handle empty `assignedTo`
        }));

        return res.status(200).json({
            message: "Data fetched successfully!",
            data: processedData,
            currentPage: pageNumber,
            totalPages,
            totalCount,
        });
    } catch (error) {
        console.error("Error fetching data:", error.message);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

module.exports = { searchModels };




