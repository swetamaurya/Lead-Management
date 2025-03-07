const ExcelJS = require("exceljs");
const { Lead } = require("../model/leadModel");

const importFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const buffer = req.file.buffer;
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ message: "File buffer is empty or invalid." });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).json({ message: "Invalid Excel file, no worksheet found." });
    }

    const leadRows = [];
    const headers = [];

    // Extract headers from the first row
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value ? cell.value.toString().trim() : null;
    });

    console.log("Extracted Headers:", headers); // Debugging log

    // Process each row in the worksheet
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) {
        const leadData = {};

        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (!header) return;

          // Convert header names to lowercase and replace spaces with underscores
          const key = ["createdAt", "updatedAt"].includes(header)
            ? header
            : header.toLowerCase().replace(/\s+/g, "_");

          // Extracting correct values
          if (typeof cell.value === "object") {
            if (cell.value.richText) {
              leadData[key] = cell.value.richText.map(rt => rt.text).join(" ").trim();
            } else if (cell.value.text) {
              leadData[key] = cell.value.text.trim();
            } else if (cell.value.hyperlink) {
              leadData[key] = cell.value.hyperlink.trim();
            }
          } else {
            leadData[key] = cell.value ? cell.value.toString().trim() : "";
          }
        });

        if (Object.keys(leadData).length > 0) {
          leadRows.push(leadData);
        }
      }
    });

    console.log("Extracted Lead Data:", leadRows); // Debugging log

    if (!leadRows.length) {
      return res.status(400).json({ message: "Uploaded Excel file has no valid data." });
    }

    // Insert data into MongoDB
    const insertedLeads = await Lead.insertMany(leadRows);

    res.status(200).json({
      message: "Leads Imported Successfully!",
      insertedLeadRecords: insertedLeads.length,
      leadData: insertedLeads,
    });
  } catch (error) {
    console.error("Error importing Excel file:", error.message);
    res.status(500).json({ message: "Internal server error: " + error.message });
  }
};

module.exports = importFromExcel;
