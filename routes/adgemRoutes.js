const express = require("express");
const router = express.Router();
const { adgemPostback } = require("../controllers/adgemController");

router.get("/postback", adgemPostback);

module.exports = router;
