const express = require("express");
const app = express()
const dotenv = require("dotenv");
const UserRoute = require("./route/userRoute");
const cors = require("cors");
const connection = require("./config/database");
const leadRouter = require("./route/leadRoute");
const deleteRouter = require("./route/deleteRoute");
const exportRouter = require("./route/exportRoute");
const searchRouter = require("./route/searchRoute");
  require("./cronJob");
dotenv.config()
PORT = process.env.PORT || 2000

 
app.use(express.json());
app.use(cors())


 
app.use("/user" , UserRoute)
 app.use("/delete",deleteRouter)
 app.use('/lead',leadRouter)
 app.use("/export",exportRouter)
app.use("/search",searchRouter)

 app.get("/test",async (req,res)=>{
    return res.status(200).send("Welcome Lead Management")
})

 
app.listen(PORT , async (req,res)=>{
    try {
        await connection
        console.log("MongoDB is connected.")
    } catch (error) {
        console.log(error)
    }
    console.log(`Server is running on PORT : ${PORT}`)
})


