import { Schema, model } from 'mongoose';

const counterSchema = new Schema({
  _id: { type: String, required: true }, // имя счетчика, например, "userId"
  seq: { type: Number, default: 0 },
});

export const Counter = model('Counter', counterSchema);
