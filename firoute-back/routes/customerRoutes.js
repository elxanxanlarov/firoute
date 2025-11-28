import express from "express";
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  toggleCustomerStatus
} from "../controllers/customerController.js";

const router = express.Router();

// GET /api/customers - Bütün müştəriləri əldə et
router.get("/", getAllCustomers);

// GET /api/customers/:id - Tək müştəri əldə et
router.get("/:id", getCustomerById);

// POST /api/customers - Yeni müştəri yarat
router.post("/", createCustomer);

// PUT /api/customers/:id - Müştəri yenilə
router.put("/:id", updateCustomer);

// DELETE /api/customers/:id - Müştəri sil
router.delete("/:id", deleteCustomer);

// PATCH /api/customers/:id/toggle - Müştəri statusunu dəyişdir
router.patch("/:id/toggle", toggleCustomerStatus);

export default router;

