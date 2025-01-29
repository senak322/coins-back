import { Schema, model, Document } from "mongoose";

interface IAccount extends Document {
  user: Schema.Types.ObjectId; // ссылка на пользователя
  system: string;             // символ или название системы (например, 'Sber', 'BTC')
  accountNumber: string;      // сам номер счёта/кошелька
  extraInfo?: string;         // «Получатель» или «Сеть»
}

const accountSchema = new Schema<IAccount>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    system: { type: String, required: true },
    accountNumber: { type: String, required: true },
    extraInfo: { type: String, required: true },
  },
  { timestamps: true } // автоматически добавит createdAt/updatedAt
);

export const Account = model<IAccount>("Account", accountSchema);
