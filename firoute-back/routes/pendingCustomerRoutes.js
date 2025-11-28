import express from "express";
import {
  getAllPendingCustomers,
  getPendingCustomerById,
  createPendingCustomer,
  updatePendingCustomer,
  deletePendingCustomer,
  updatePendingCustomerStatus
} from "../controllers/pendingCustomerController.js";

const router = express.Router();

// GET /api/pending-customers - Bütün pending customer-ləri əldə et
router.get("/", getAllPendingCustomers);

// GET /api/pending-customers/:id - Tək pending customer əldə et
router.get("/:id", getPendingCustomerById);

// POST /api/pending-customers - Yeni pending customer yarat
router.post("/", createPendingCustomer);

// PUT /api/pending-customers/:id - Pending customer yenilə
router.put("/:id", updatePendingCustomer);

// DELETE /api/pending-customers/:id - Pending customer sil
router.delete("/:id", deletePendingCustomer);

// PATCH /api/pending-customers/:id/status - Pending customer statusunu dəyişdir
router.patch("/:id/status", updatePendingCustomerStatus);

export default router;

