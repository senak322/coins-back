import { Request, Response } from "express";
import { Account } from "../models/Account";
import Order from "../models/Order";

// GET /api/accounts
export async function getAccounts(req: Request, res: Response) {
  try {
    // userId из authMiddleware
    const userId = (req as any).userId;
    const accounts = await Account.find({ user: userId });
    return res.json(accounts); // вернём массив
  } catch (err) {
    console.error("getAccounts error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// POST /api/accounts
export async function createAccount(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { system, accountNumber, extraInfo } = req.body;

    if (!system || !accountNumber) {
      return res
        .status(400)
        .json({ error: "system и accountNumber – обязательные поля" });
    }

    // Создаём документ
    const newAccount = new Account({
      user: userId,
      system,
      accountNumber,
      extraInfo,
    });

    await newAccount.save();
    return res.status(201).json(newAccount);
  } catch (err) {
    console.error("createAccount error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// PATCH /api/accounts/:id
export async function updateAccount(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const accountId = req.params.id;
    const { system, accountNumber, extraInfo } = req.body;

    // Ищем счёт, который принадлежит этому userId
    const account = await Account.findOne({ _id: accountId, user: userId });
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Обновляем поля
    if (typeof system === "string") {
      account.system = system;
    }
    if (typeof accountNumber === "string") {
      account.accountNumber = accountNumber;
    }
    if (typeof extraInfo === "string") {
      account.extraInfo = extraInfo;
    }

    await account.save();
    return res.json(account);
  } catch (err) {
    console.error("updateAccount error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// DELETE /api/accounts/:id
export async function deleteAccount(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const accountId = req.params.id;

    // Удаляем счёт
    const account = await Account.findOneAndDelete({ _id: accountId, user: userId });
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    return res.json({ message: "Account deleted" });
  } catch (err) {
    console.error("deleteAccount error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}


