import mongoose from "mongoose";
const { Schema, model, models, Types } = mongoose;

const requestSchema = new Schema(
  {
    status: {
      type: String,
      required: true,
      default: "pending",
      enum: ["pending", "accepted", "rejected"],
    },

    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const requestModel =
  models.requestModel || model("Request", requestSchema);
