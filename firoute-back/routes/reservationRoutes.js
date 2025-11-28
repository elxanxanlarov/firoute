import express from "express";
import {
  getAllReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
  updateReservationStatus
} from "../controllers/reservationController.js";

const router = express.Router();

// GET /api/reservations - Bütün rezervasiyaları əldə et
router.get("/", getAllReservations);

// GET /api/reservations/:id - Tək rezervasiya əldə et
router.get("/:id", getReservationById);

// POST /api/reservations - Yeni rezervasiya yarat
router.post("/", createReservation);

// PUT /api/reservations/:id - Rezervasiya yenilə
router.put("/:id", updateReservation);

// DELETE /api/reservations/:id - Rezervasiya sil
router.delete("/:id", deleteReservation);

// PATCH /api/reservations/:id/status - Rezervasiya statusunu dəyişdir
router.patch("/:id/status", updateReservationStatus);

export default router;

