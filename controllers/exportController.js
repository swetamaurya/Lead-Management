const moment = require("moment");
const ExcelJS = require("exceljs");
const { Lead } = require("../model/leadModel");
const { User } = require("../model/userModel");

const formatDateTime = (dateString) => {
    if (!dateString || typeof dateString !== "string" || !dateString.includes("T")) return "-";
    const parsedDate = moment(dateString, moment.ISO_8601, true);
    return parsedDate.isValid() ? parsedDate.format("DD-MM-YYYY hh:mm A") : "-";
};

const exportData = async (req, res) => {
    const { page, limit } = req.query;
    const { _id } = req.body;

    try {
        const skip = page ? (page - 1) * (limit || 10) : 0;
        const parsedLimit = limit ? parseInt(limit) : 10;

        // Fetch Leads with `assignedTo` populated
        let leadQuery = Lead.find().sort({ _id: -1 }).skip(skip).limit(parsedLimit);
        if (_id && Array.isArray(_id) && _id.length > 0) {
            leadQuery = Lead.find({ _id: { $in: _id } }).sort({ _id: -1 });
        }
        leadQuery = leadQuery.populate({
            path: "assignedTo",
            select: "name email roles",
        });

        const leads = await leadQuery.lean();

        // Fetch Users with `assigned` (Leads assigned to them) populated
        let userQuery = User.find().sort({ _id: -1 }).skip(skip).limit(parsedLimit);
        if (_id && Array.isArray(_id) && _id.length > 0) {
            userQuery = User.find({ _id: { $in: _id } }).sort({ _id: -1 });
        }
        userQuery = userQuery.populate({
            path: "assigned",
            select: "leadId name email form_type year make model part",
        });

        const users = await userQuery.lean();

        if (leads.length === 0 && users.length === 0) {
            return res.status(404).json({ message: "No records found." });
        }

        return generateExcelFile(res, { Leads: leads, Users: users });
    } catch (error) {
        console.error("Error exporting data:", error);
        return res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
};

const flattenData = (entry, modelName) => {
    const flatObject = {};
    const excludeKeys = ["__v", "password", "_id",  ];

    const processNestedObject = (key, value, prefix = "") => {
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
            if (!excludeKeys.includes(nestedKey)) {
                flatObject[`${prefix}${key}_${nestedKey}`] =
                    typeof nestedValue === "object" && nestedValue !== null
                        ? JSON.stringify(nestedValue)
                        : nestedValue || "-";
            }
        });
    };


    for (const [key, value] of Object.entries(entry)) {
        if (excludeKeys.includes(key)) continue;

        if (modelName === "Leads" && key === "assignedTo") {
            // Format assigned user(s) properly
            flatObject[key] = value ? `${value.name} (${value.email}, ${value.roles})` : "-";
        } else if (modelName === "Users" && key === "assigned") {
            flatObject[key] = Array.isArray(value) && value.length > 0
                ? value.map(lead => {
                    return `${lead.leadId || ""} - ${lead.name || ""} (${lead.email || ""}, ${lead.year || ""} ${lead.make || ""} ${lead.model || ""} - ${lead.part || ""})`;
                }).join("; ")
                : "-";
        } else if (typeof value === "string" && value.includes("T")) {
            flatObject[key] = formatDateTime(value);
        } else 
        if (Buffer.isBuffer(value)) {
            flatObject[key] = value.toString("hex");
        } else if (Array.isArray(value)) {
            if (key === "callInfo") {
                // Format CallInfo properly
                flatObject[key] = value.map((item) =>
                    `Date: ${item.date}, Next Follow-up: ${item.nextFollowUpdate}, Status: ${item.status}, Remark: ${item.remark}`
                ).join(" | ");
            } else {
                flatObject[key] = value.map((item) => JSON.stringify(item)).join(", ");
            }
        } else if (typeof value === "object" && value !== null) {
            processNestedObject(key, value);
        } 
        else {
            flatObject[key] = value;
        }
    }

    return flatObject;
};

const generateExcelFile = async (res, data) => {
    const workbook = new ExcelJS.Workbook();

    for (const [modelName, modelData] of Object.entries(data)) {
        const worksheet = workbook.addWorksheet(modelName);
        const flatData = modelData.map((item) => flattenData(item, modelName));

        if (flatData.length === 0) continue;

        const formatHeader = (header) =>
            header.replace(/_/g, " ").replace(/\b\w/g, (char, index) => (index === 0 ? char.toUpperCase() : char.toLowerCase()));

        worksheet.columns = Object.keys(flatData[0]).map((key) => ({
            header: formatHeader(key),
            key: key,
            width: 25,
        }));

        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFF" } };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "3e80f9" },
            };
            cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        flatData.forEach((item) => worksheet.addRow(item));
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="exported-users-leads.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
};

module.exports = exportData ;
