import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { getBase64, getSockets } from "../lib/helper.lib.js";

export const cookieOption = {
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

export const connectDB = (uri) => {
  mongoose
    .connect(uri, { dbName: "Whatsup" })
    .then((e) => console.log("DB Connected"))
    .catch((err) => {
      throw err;
    });
};

export const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res
    .status(code)
    .cookie("whatsup-token", token, cookieOption)
    .json({ success: true, message, user });
};

export const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const usersSocket = getSockets(users);

  io.to(usersSocket).emit(event, data);
};

export const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromise = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        { resource_type: "auto", public_id: uuid() },
        (error, result) => {
          if (error) reject(error);
          resolve(result);
        }
      );
    });
  });

  try {
    const results = await Promise.all(uploadPromise);
    const formatedResults = results.map((result) => {
      return { public_id: result.public_id, url: result.secure_url };
    });
    return formatedResults;
  } catch (error) {
    throw new Error("Error uploadin files to cloudinary", error);
  }
};

export const deleteFilesFromCloudinary = (public_ids) => {};
