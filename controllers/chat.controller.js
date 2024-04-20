import { TryCatch } from "../middlewares/error.middleware.js";
import { ErrorHandler } from "../utils/utility.js";
import { chatModel } from "../models/chat.model.js";
import { userModel } from "../models/user.models.js";
import { messageModel } from "../models/message.model.js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/features.utils.js";
import {
  ALERT,
  NEW_ATTACHMENT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.contants.js";
import { getOtherMember } from "../lib/helper.lib.js";

const newGroupChat = TryCatch(async (req, res, next) => {
  const { name, members } = req.body;
  console.log(name);

  if (members.length < 2)
    return next(new ErrorHandler("Must add atleast 2 members", 400));

  const allMemebers = [...members, req.user];

  await chatModel.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMemebers,
  });

  emitEvent(req, ALERT, allMemebers, `You were added in ${name} group`);
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({ success: true, message: "Group created" });
});

const getMyChats = TryCatch(async (req, res, next) => {
  const chats = await chatModel
    .find({ members: req.user })
    .populate("members", "name avatar");

  const transformedChats = chats.map(({ _id, name, groupChat, members }) => {
    const otherMember = getOtherMember(members, req.user);
    return {
      _id,
      name: groupChat ? name : otherMember.name,
      groupChat,
      members: members.reduce((acu, curr) => {
        if (curr._id.toString() !== req.user.toString()) {
          acu.push(curr._id);
        }
        return acu;
      }, []),
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
      // lastMessage: chat.lastMessage
    };
  });

  return res.status(200).json({ success: true, chats: transformedChats });
});

const getMyGroups = TryCatch(async (req, res, next) => {
  const chats = await chatModel
    .find({ members: req.user, groupChat: true, creator: req.user })
    .populate("members", "name avatar");

  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    _id,
    groupChat,
    name,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));

  // const myOnlyGroups = groups.data.chats.filter(({ groupChat }) => groupChat);

  return res.status(200).json({ success: true, groups });
});

const addMembers = TryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;

  if (!members || members.length == 0)
    next(new ErrorHandler("please provide members", 400));

  const chat = await chatModel.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.groupChat) return next(new ErrorHandler("Not a group chat", 404));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("Admin Required", 403));

  const allNewMembersPromise = members.map((i) =>
    userModel.findById(i, "name")
  );

  const allNewMembers = await Promise.all(allNewMembersPromise);
  const uniqueMembers = allNewMembers
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i) => i._id);

  chat.members.push(...uniqueMembers);

  if (chat.members.length > 10)
    return next(new ErrorHandler("Members limit is 10 can't add more", 400));

  await chat.save();

  const allUsersName = allNewMembers.map((i) => i.name).join(",");

  emitEvent(req, ALERT, chat.members, `${allUsersName} added to the Group`);
  emitEvent(req, REFETCH_CHATS, chat.members);

  return res
    .status(200)
    .json({ success: true, message: "Members added successfully" });
});

const removeMember = TryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;

  const [chat, toBeRemoved] = await Promise.all([
    chatModel.findById(chatId),
    userModel.findById(userId, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.groupChat) return next(new ErrorHandler("Not a group chat", 404));

  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("Admin Required", 403));

  if (chat.members.length <= 3)
    return next(new ErrorHandler("Atleast 3 Members Required", 400));

  if (!toBeRemoved) new ErrorHandler("user not found", 404);

  const allChatMembers = chat.members.map((i) => i.toString());

  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );

  await chat.save();

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${toBeRemoved} was removed from the Group`
  );
  emitEvent(req, REFETCH_CHATS, allChatMembers);

  return res
    .status(200)
    .json({ success: true, message: "Member removed form the group" });
});

const leaveGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await chatModel.findById(chatId);

  if (!chat) return next(new ErrorHandler("chat not found", 404));

  if (!chat.groupChat) return next(new ErrorHandler("Not a group chat", 404));

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );

  if (chat.creator.toString() === req.user.toString()) {
    const randomNum = Math.floor(Math.random() * remainingMembers.length);
    const newCreator = remainingMembers[randomNum];

    chat.creator = newCreator;
  }

  chat.members = remainingMembers;
  const [user] = await Promise.all([
    userModel.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, `user ${user} left the group`);

  return res.status(200).json({ success: true, message: "successfully left" });
});

const sendAttachments = TryCatch(async (req, res, next) => {
  const { chatId } = req.body;

  const files = req.files || [];

  if (files.length < 1)
    return next(new ErrorHandler("please provide attachment", 400));

  if (files.length > 5)
    return next(new ErrorHandler("Not more than 5 files are allowed", 400));

  const [chat, me] = await Promise.all([
    chatModel.findById(chatId),
    userModel.findById(req.user, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("chat not found", 400));

  //upload files here cloudinary

  const attachments = await uploadFilesToCloudinary(files);

  const messageForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };

  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: me._id,
      name: me.name,
    },
  };

  const message = await messageModel.create(messageForDB);

  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  return res.status(200).json({ success: true, message });
});

const getMessages = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;

  const resultPerPage = 20;
  const skip = (page - 1) * resultPerPage;

  const chat = await chatModel.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.members.includes(req.user.toString()))
    return next(
      new ErrorHandler("You are not allowed to access this chat", 403)
    );

  const [messages, totalMessagesCount] = await Promise.all([
    messageModel
      .find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(resultPerPage)
      .populate("sender", "name")
      .lean(),
    messageModel.countDocuments({ chat: chatId }),
  ]);

  const totalPages = Math.ceil(totalMessagesCount / resultPerPage) || 0;

  return res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalPages,
  });
});

const getChatDetails = TryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await chatModel
      .findById(req.params.id)
      .populate("members", "name avatar")
      .lean();

    if (!chat) return next(new ErrorHandler("chat not found", 400));

    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    return res.status(200).json({ success: true, chat });
  } else {
    const chat = await chatModel.findById(req.params.id);
    if (!chat) return next(new ErrorHandler("chat not found", 400));

    return res.status(200).json({ success: true, chat });
  }
});

const renameGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;

  const chat = await chatModel.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("This chat cant be renamed", 400));

  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("Admin Required", 400));

  chat.name = name;
  chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res
    .status(200)
    .json({ success: true, message: "Successfully Renamed" });
});

const deleteChat = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await chatModel.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const members = chat.members;

  if (chat.groupChat && chat.creator.toString() !== req.user.toString())
    return next(
      new ErrorHandler("You are not allowed to delete the group", 403)
    );

  if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
    return next(
      new ErrorHandler("You are not allowed to delete the chat", 403)
    );
  }

  //   Here we have to dete All Messages as well as attachments or files from cloudinary

  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];

  messagesWithAttachments.forEach(({ attachments }) =>
    attachments.forEach(({ public_id }) => public_ids.push(public_id))
  );

  await Promise.all([
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully",
  });
});

export {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMembers,
  removeMember,
  leaveGroup,
  sendAttachments,
  getMessages,
  getChatDetails,
  renameGroup,
  deleteChat,
};
