import express from "express";
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
} from "../controllers/roomController.js";

const router = express.Router();

// GET /api/rooms - Bütün otaqları əldə et
router.get("/", getAllRooms);

// GET /api/rooms/:id - Tək otaq əldə et
router.get("/:id", getRoomById);

// POST /api/rooms - Yeni otaq yarat
router.post("/", createRoom);

// PUT /api/rooms/:id - Otaq yenilə
router.put("/:id", updateRoom);

// DELETE /api/rooms/:id - Otaq sil
router.delete("/:id", deleteRoom);

export default router;

