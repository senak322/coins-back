import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";

export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "No user id" });
    }
    const user = await User.findById(userId);
    if (!user || user.role_id !== 2) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
}
