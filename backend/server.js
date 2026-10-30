require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const petRoutes = require("./routes/pets");
const recordRoutes = require("./routes/records");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to a random string of at least 32 characters in backend/.env");
}
const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  fontSrc: ["'self'", "https://fonts.gstatic.com"], imgSrc: ["'self'", "data:"], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"]
}}}));
app.use(express.json({limit:"20kb"}));
app.use(cookieParser());
app.use("/api/auth", rateLimit({windowMs:15*60*1000, limit:30, standardHeaders:"draft-8", legacyHeaders:false, message:{error:"Too many authentication attempts. Please wait and try again."}}));
app.get("/api/health", (req,res)=>res.json({status:"ok", service:"PetCareLog API"}));
app.use("/api/auth",authRoutes);
app.use("/api/pets",petRoutes);
app.use("/api",recordRoutes);
app.use(express.static(path.join(__dirname,"..","frontend")));
app.use("/api",(req,res)=>res.status(404).json({error:"API endpoint not found."}));
app.use((err,req,res,next)=>{
  console.error("Request failed:",err?.message || "Unknown error");
  if(res.headersSent) return next(err);
  res.status(500).json({error:"The server could not complete that request. Check the server configuration and try again."});
});
const port=Number(process.env.PORT)||3000;
app.listen(port,()=>console.log(`PetCareLog is running at http://localhost:${port}`));
