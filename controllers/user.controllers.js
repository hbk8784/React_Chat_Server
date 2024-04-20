import { TryCatch } from "../middlewares/error.middleware.js";
import { userModel } from "../models/user.models.js";
import { chatModel } from "../models/chat.model.js";
import {
  emitEvent,
  sendToken,
  uploadFilesToCloudinary,
} from "../utils/features.utils.js";
import bcrypt from "bcryptjs";
const { compare } = bcrypt;
import { ErrorHandler } from "../utils/utility.js";
import { cookieOption } from "../utils/features.utils.js";
import { requestModel } from "../models/request.model.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.contants.js";
import { getOtherMember } from "../lib/helper.lib.js";

//creat a new user and save it to database and save in cookie
const newUser = TryCatch(async (req, res, next) => {
  const { name, username, bio, password } = req.body;
  const file = req.file;

  if (!file) return next(new ErrorHandler("please upload pic", 400));

  const result = await uploadFilesToCloudinary([file]);

  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };
  const user = await userModel.create({
    name,
    username,
    bio,
    password,
    avatar,
  });
  sendToken(res, user, 201, "User Created");
});

//logging in user with username and password
const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;

  let user = await userModel.findOne({ username }).select("+password");

  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const isMatch = await compare(password, user.password);

  if (!isMatch)
    return next(new ErrorHandler("Invalid username or password", 404));

  sendToken(res, user, 200, `welcome Back, ${user.name} `);
});

//user Profile
const getMyProfile = TryCatch(async (req, res, next) => {
  const user = await userModel.findById(req.user);

  res.status(200).json({ user });
});

const logout = (req, res, next) => {
  res
    .status(200)
    .cookie("whatsup-token", "", { ...cookieOption, maxAge: 0 })
    .json({ message: "logged out successfully", success: true });
};

const searchUser = TryCatch(async (req, res, next) => {
  const { name } = req.query;

  // if (!name) return next(new ErrorHandler("Provide search value", 400));

  const myChat = await chatModel.find({ groupChat: false, members: req.user });
  const allUserFromMyChat = myChat.flatMap((chat) => chat.members);

  const allUserExceptMeAndFriends = await userModel.find({
    _id: { $nin: allUserFromMyChat },
    name: { $regex: name, $options: "i" },
  });

  const users = allUserExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  res.status(200).json({ users });
});

const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { receiverId } = req.body;

  if (!receiverId)
    return next(new ErrorHandler("receiver id is required", 400));

  const request = await requestModel.findOne({
    $or: [
      { sender: req.user, receiver: receiverId },
      { sender: receiverId, receiver: req.user },
    ],
  });

  if (request) return next(new ErrorHandler("Request already send", 400));

  await requestModel.create({ sender: req.user, receiver: receiverId });

  emitEvent(req, NEW_REQUEST, [receiverId]);

  return res.status(200).json({ success: true, message: "Request sent" });
});

const acceptFriendRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  // console.log("these are the info", requestId, accept);

  const request = await requestModel
    .findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  // console.log(request);

  if (!request) return next(new ErrorHandler("request  not found", 404));

  if (request.receiver._id.toString() !== req.user.toString())
    return next(new ErrorHandler("Unauthorized", 401));

  if (!accept) {
    await request.deleteOne();

    return res
      .status(200)
      .json({ success: true, message: "Friend Request rejected" });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    chatModel.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res
    .status(200)
    .json({ success: true, message: "Friend Request Accepted" });
});

const getMyNotifications = TryCatch(async (req, res, next) => {
  const requests = await requestModel
    .find({ receiver: req.user })
    .populate("sender", "name avatar");

  const allRequest = requests.map(({ _id, sender }) => ({
    _id,
    sender: { _id: sender._id, name: sender.name, avatar: sender.avatar.url },
  }));

  return res.status(200).json({ success: true, allRequest });
});

const getMyFriends = TryCatch(async (req, res) => {
  const chatId = req.query.chatId;

  const chats = await chatModel
    .find({
      members: req.user,
      groupChat: false,
    })
    .populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);

    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });

  if (chatId) {
    const chat = await Chat.findById(chatId);

    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );

    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});

export {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getMyNotifications,
  getMyFriends,
};
