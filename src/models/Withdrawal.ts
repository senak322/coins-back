import { Schema, model, Document } from "mongoose";

export interface IWithdrawal extends Document {
  withdrawalId: string;
  user: Schema.Types.ObjectId;
  amount: number; // в рублях
  contact: string;
  status: "new" | "in_progress" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    withdrawalId: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    contact: { type: String, required: true },
    status: {
      type: String,
      enum: ["new", "in_progress", "completed", "cancelled"],
      default: "new",
    },
  },
  { timestamps: true }
);

export default model<IWithdrawal>("Withdrawal", WithdrawalSchema);
