import { Schema, model, Document } from "mongoose";

export interface ITier {
  min: number;
  max: number;
  commission: number;
}

export interface ICommissionConfig extends Document {
  usdt: ITier[];
  btc: ITier[];
  alt: ITier[];
  createdAt: Date;
  updatedAt: Date;
}

const CommissionConfigSchema = new Schema<ICommissionConfig>(
  {
    usdt: { type: [{ min: Number, max: Number, commission: Number }], default: [] },
    btc: { type: [{ min: Number, max: Number, commission: Number }], default: [] },
    alt: { type: [{ min: Number, max: Number, commission: Number }], default: [] },
  },
  { timestamps: true }
);

export const CommissionConfig = model<ICommissionConfig>("CommissionConfig", CommissionConfigSchema);


export async function getCommissionConfig() {
    let config = await CommissionConfig.findOne();
    if (!config) {
      config = new CommissionConfig({
        usdt: [
          { min: 5000, max: 50000, commission: 0.04 },
          { min: 50001, max: 100000, commission: 0.03 },
          { min: 100001, max: 10000000, commission: 0.025 },
        ],
        btc: [
          { min: 5000, max: 50000, commission: 0.06 },
          { min: 50001, max: 100000, commission: 0.05 },
          { min: 100001, max: 10000000, commission: 0.04 },
        ],
        alt: [
          { min: 5000, max: 100000, commission: 0.05 },
          { min: 100001, max: 10000000, commission: 0.06 },
        ]
      });
      await config.save();
    }
    return config;
  }