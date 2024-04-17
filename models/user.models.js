import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema, model, models } = mongoose;
const { hash } = bcrypt;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: true,
      select: false,
    },
    bio: {
      type: String,
      required: true,
    },
    avatar: {
      public_id: { type: String, required: true },
      url: { type: String, required: true },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await hash(this.password, 10);
});

export const userModel = models.userModel || model("User", userSchema);
