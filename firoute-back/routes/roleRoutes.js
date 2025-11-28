import express from "express";
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  toggleRoleStatus
} from "../controllers/roleController.js";

const router = express.Router();

// GET /api/roles - Bütün rolları əldə et
router.get("/", getAllRoles);

// GET /api/roles/:id - Tək rol əldə et
router.get("/:id", getRoleById);

// POST /api/roles - Yeni rol yarat
router.post("/", createRole);

// PUT /api/roles/:id - Rol yenilə
router.put("/:id", updateRole);

// DELETE /api/roles/:id - Rol sil
router.delete("/:id", deleteRole);

// PATCH /api/roles/:id/toggle - Rol statusunu dəyişdir
router.patch("/:id/toggle", toggleRoleStatus);

export default router;
