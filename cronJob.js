const cron = require("node-cron");
const { webSiteLead } = require("./controllers/leadcontroller");

// Schedule the cron job to run every 30 seconds
cron.schedule("*/10 * * * * *", async () => {
//   console.log("Running scheduled task: Fetching new leads from API...");
  try {
    const result = await webSiteLead(); // Call without `req, res`
    // console.log(result.message);
  } catch (error) {
    console.error("Cron job error:", error.message);
  }
});

// console.log("Cron job started: Fetching leads every 30 seconds.");
