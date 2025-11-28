import express from "express";
import {
  getAllActivities,
  getCustomerActivities
} from "../controllers/systemActivityController.js";

const router = express.Router();

// GET /api/system-activities - Bütün əməliyyatları əldə et
router.get("/", getAllActivities);

// GET /api/system-activities/customer/:customerId - Müştərinin əməliyyatlarını əldə et
router.get("/customer/:customerId", getCustomerActivities);

export default router;

