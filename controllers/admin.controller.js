import { TryCatch } from "../middlewares/error.middleware.js";
import { chatModel } from "../models/chat.model.js";
import { messageModel } from "../models/message.model.js";
import { userModel } from "../models/user.models.js";
import { cookieOption } from "../utils/features.utils.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";

const adminLogin = TryCatch(async (req, res, next) => {
  const { secretKey } = req.body;

  if (!secretKey)
    return next(new ErrorHandler("Please provide secretKey", 400));

  const adminSecretKey = process.env.ADMIN_SECRET_KEY || "265495";

  const isMatched = secretKey === adminSecretKey;

  if (!isMatched) return next(new ErrorHandler("Wrong key", 401));

  const token = jwt.sign({ secretKey }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  return res
    .status(200)
    .cookie("admin-token", token, cookieOption)
    .json({ success: true, message: "Auth success, welcome Master" });
});

const adminLogout = TryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("admin-token", "", { ...cookieOption, maxAge: 0 })
    .json({ success: true, message: "logged Out successfully" });
});

const getAdminData = TryCatch(async (req, res, next) => {
  return res.status(200).json({ admin: true });
});

const getAllUsers = TryCatch(async (req, res, next) => {
  const users = await userModel.find({});

  const transformUsers = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) => {
      const [groups, friends] = await Promise.all([
        chatModel.countDocuments({ groupChat: true, members: _id }),
        chatModel.countDocuments({ groupChat: false, members: _id }),
      ]);
      return {
        _id,
        name,
        username,
        avatar: avatar.url,
        groups,
        friends,
      };
    })
  );

  return res.status(200).json({ success: true, users: transformUsers });
});

const getAllChat = TryCatch(async (req, res, next) => {
  const chats = await chatModel
    .find({})
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformedChats = await Promise.all(
    chats.map(async ({ members, _id, groupChat, name, creator }) => {
      const totalMessages = await messageModel.countDocuments({ chat: _id });

      return {
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => ({
          _id,
          name,
          avatar: avatar.url,
        })),
        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );
  return res.status(200).json({ success: true, chats: transformedChats });
});

const getAllMessages = TryCatch(async (req, res) => {
  const messages = await messageModel
    .find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  const transformedMessages = messages.map(
    ({ content, attachments, _id, sender, createdAt, chat }) => ({
      _id,
      attachments,
      content,
      createdAt,
      chat: chat._id,
      groupChat: chat.groupChat,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    })
  );

  return res.status(200).json({
    success: true,
    messages: transformedMessages,
  });
});

const getDashboardStats = TryCatch(async (req, res) => {
  const [groupsCount, usersCount, messagesCount, totalChatsCount] =
    await Promise.all([
      chatModel.countDocuments({ groupChat: true }),
      userModel.countDocuments(),
      messageModel.countDocuments(),
      chatModel.countDocuments(),
    ]);

  const today = new Date();

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const last7DaysMessages = await messageModel
    .find({
      createdAt: {
        $gte: last7Days,
        $lte: today,
      },
    })
    .select("createdAt");

  const messages = new Array(7).fill(0);
  const dayInMiliseconds = 1000 * 60 * 60 * 24;

  last7DaysMessages.forEach((message) => {
    const indexApprox =
      (today.getTime() - message.createdAt.getTime()) / dayInMiliseconds;
    const index = Math.floor(indexApprox);

    messages[6 - index]++;
  });

  const stats = {
    groupsCount,
    usersCount,
    messagesCount,
    totalChatsCount,
    messagesChart: messages,
  };

  return res.status(200).json({
    success: true,
    stats,
  });
});

export {
  getAllUsers,
  getAllChat,
  getAllMessages,
  getDashboardStats,
  adminLogin,
  adminLogout,
  getAdminData,
};
