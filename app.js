const express = require("express");
const dbRoutes = require("./routes/db.routes");
const path = require("path");

const profileCreate = require("./routes/profileCreate.js");
const profileRead = require("./routes/profileRead.js");

const buyPrebuiltRouter = require("./routes/prebuilt_search.js");

const rentReq = require("./routes/rent_req.js");

const homeproductsRouter = require("./routes/home_product.js");

const app = express();

// Serve uploaded images
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

app.use(express.json());

app.use("/testdb", dbRoutes);

app.use("/account", profileCreate);
app.use("/account", profileRead);

app.use("/manufacturers", buyPrebuiltRouter);
app.use("/manufacturers", require("./routes/prebuilt_show.js"));

app.use("/rental", rentReq);
// app.use("/rental", require("./routes/prebuilt_show.js"));

app.use("/homeproducts", homeproductsRouter);
// app.use("/manufacturers", require("./routes/prebuilt_show.js"));

app.use("/repair_item", require("./routes/repair_req.js"));

app.use("/customise", require("./routes/customise.js"));

module.exports = app;
