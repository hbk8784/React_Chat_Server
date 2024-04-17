import { body, check, param, query, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const registerValidator = () => [
  body("name", "please enter name").notEmpty(),
  body("username", "please enter username").notEmpty(),
  body("bio", "please enter bio").notEmpty(),
  body("password", "please enter password").notEmpty(),
];

const loginValidator = () => [
  body("username", "please enter username").notEmpty(),
  body("password", "please enter password").notEmpty(),
];

const newGroupValidator = () => [
  body("name", "please enter name").notEmpty(),
  body("members", "please select members")
    .notEmpty()
    .isArray({ min: 2, max: 10 })
    .withMessage("Minimum 2 and maximum 10 members are allowed"),
];

const addMemberValidator = () => [
  body("chatId", "please enter name").notEmpty(),
  body(["members", "please select a member"])
    .notEmpty()
    .isArray({ min: 1 })
    .withMessage("atleast select one member"),
];

const removeMemberValidator = () => [
  body("chatId", "please chatId").notEmpty(),
  body(["userId", "please provide userId"]).notEmpty(),
];

const leaveGroupValidator = () => [
  param("id", "please provide chatId").notEmpty(),
];

const sendAttachmentValidator = () => [
  body("chatId", "please provide chatId").notEmpty(),
];

const getMessageValidator = () => [
  param("id", "please provide id").notEmpty(),
  // query("page").withMessage("page number is required").notEmpty(),
];

const getChatDetailsValidator = () => [
  param("id", "please provide id").notEmpty(),
];

const renameValidator = () => [
  param("id", "please provide id").notEmpty(),
  body("name", "please enter new name").notEmpty(),
];

const deleteValidator = () => [param("id", "please provide id").notEmpty()];

const validateHandler = (req, res, next) => {
  const errors = validationResult(req);

  if (errors) {
    const msg = errors
      .array()
      .map(({ msg }) => msg)
      .join(", ");
    return next(new ErrorHandler(msg, 400));
  } else return next();
};

export {
  registerValidator,
  validateHandler,
  loginValidator,
  newGroupValidator,
  addMemberValidator,
  removeMemberValidator,
  leaveGroupValidator,
  sendAttachmentValidator,
  getMessageValidator,
  getChatDetailsValidator,
  renameValidator,
  deleteValidator,
};
