import express from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} from "../controllers/userController.js";

const router = express.Router();

// GET /api/users - Bütün istifadəçiləri əldə et
router.get("/", getAllUsers);

// GET /api/users/:id - Tək istifadəçi əldə et
router.get("/:id", getUserById);

// POST /api/users - Yeni istifadəçi yarat
router.post("/", createUser);

// PUT /api/users/:id - İstifadəçi yenilə
router.put("/:id", updateUser);

// DELETE /api/users/:id - İstifadəçi sil
router.delete("/:id", deleteUser);

// PATCH /api/users/:id/toggle - İstifadəçi statusunu dəyişdir
router.patch("/:id/toggle", toggleUserStatus);

export default router;
