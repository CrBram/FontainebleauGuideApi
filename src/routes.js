import express from "express";
import jsonData from "./data/hotspots.json" with { type: "json" };

const { hotspots } = jsonData;

const router = express.Router();

// Get all hotspots
router.get("/hotspots", (req, res) => {
  res.json(hotspots);
});

export default router;
