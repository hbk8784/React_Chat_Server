import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
const app = express();
import cors from "cors";

import { connectDB } from "./utils/features.utils.js";
import dotevn from "dotenv";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middlewares/error.middleware.js";
dotevn.config({ path: "./.env" });

import userRoute from "./routes/user.routes.js";
import chatRoute from "./routes/chat.routes.js";
import adminRoute from "./routes/admin.routes.js";
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  OFLINE_USERS,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
} from "./constants/events.contants.js";
import { v4 as uuid } from "uuid";
import { messageModel } from "./models/message.model.js";
import { getSockets } from "./lib/helper.lib.js";
export const envMode = process.env.NODE_ENV || "PRODUCTION";
import { v2 as cloudinary } from "cloudinary";
import { corsOptions } from "./constants/config.constant.js";
import { socketAuthenticator } from "./middlewares/auth.middleware.js";

// import { createUser } from "./seeders/user.seed.js";
// import {
//   createSingleChats,
//   createGroupChats,
//   createMessages,
// } from "./seeders/chat.seed.js";

// formData.append("file", image);
// formData.append("upload_preset", "chat-application");
// formData.append("cloud_name", "df7a1aeku");
// await fetch("https://api.cloudinary.com/v1_1/df7a1aeku/image/upload", {
//   method: "POST",
//   body: formData,
// })

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

app.use(cors(corsOptions));

export const userSocketIDs = new Map();

connectDB(process.env.MONGO_URI);
const PORT = process.env.PORT || 8080;
export const adminSecretKey = process.env.ADMIN_SECRET_KEY || "265495";

app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.use(errorMiddleware);

//-------------------Socket.io------------------------------------

const onlineUsers = new Set();

io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await socketAuthenticator(err, socket, next);
  });
});

io.on("connection", (socket) => {
  const user = socket.user;
  userSocketIDs.set(user._id.toString(), socket.id);
  // console.log("a user connected", userSocketIDs);

  socket.on(NEW_MESSAGE, async ({ chatId, members, messages }) => {
    const messageForRealTime = {
      content: messages,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chatId,
      createdAt: new Date().toISOString(),
    };
    // console.log("message for realtime ", messageForRealTime);

    // console.log("emmiting message for real time", messageForRealTime);

    const messageForDB = {
      content: messages,
      sender: user._id,
      chat: chatId,
    };

    const memberSocket = getSockets(members);

    io.to(memberSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });

    io.to(memberSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      await messageModel.create(messageForDB);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    console.log("typing ", members, chatId);

    const memberSocket = getSockets(members);

    socket.to(memberSocket).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const memberSocket = getSockets(members);
    socket.to(memberSocket).emit(STOP_TYPING, { chatId });
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    userSocketIDs.delete(user._id.toString);
    // console.log("user disconnected");
    onlineUsers.delete(user._id.toString());

    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

server.listen(PORT, () => {
  console.log(`Active on PORT ${PORT} / ${envMode} Mode`);
});

// createUser(5); this is seed for testing only
// createSingleChats(10);
// createGroupChats(5);
// createMessages("6616d826ff2319247ba4e189", 50);
