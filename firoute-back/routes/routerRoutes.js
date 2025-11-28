import express from "express";
import {
  getAllRouters,
  getRouterById,
  createRouter,
  updateRouter,
  deleteRouter,
  toggleRouterStatus
} from "../controllers/routerController.js";

const router = express.Router();

// GET /api/routers - Bütün router-ləri əldə et
router.get("/", getAllRouters);

// GET /api/routers/:id - Tək router əldə et
router.get("/:id", getRouterById);

// POST /api/routers - Yeni router yarat
router.post("/", createRouter);

// PUT /api/routers/:id - Router yenilə
router.put("/:id", updateRouter);

// DELETE /api/routers/:id - Router sil
router.delete("/:id", deleteRouter);

// PATCH /api/routers/:id/status - Router statusunu dəyişdir
router.patch("/:id/status", toggleRouterStatus);

export default router;

