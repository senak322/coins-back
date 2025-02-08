import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../controllers/accountController";

const router = Router();

// Все операции только для авторизованных пользователей
router.get("/", authMiddleware, getAccounts);
router.post("/", authMiddleware, createAccount);
router.patch("/:id", authMiddleware, updateAccount);
router.delete("/:id", authMiddleware, deleteAccount);

export default router;
