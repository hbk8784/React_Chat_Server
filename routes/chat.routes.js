import express from "express";
// const app  = express();
const router = express.Router();
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import {
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
} from "../controllers/chat.controller.js";
import { atachmentsMulter } from "../middlewares/multer.middlewares.js";

router.route("/new").post(isAuthenticated, newGroupChat);
router.route("/my").get(isAuthenticated, getMyChats);
router.route("/my/groups").get(isAuthenticated, getMyGroups);
router.route("/addmembers").put(isAuthenticated, addMembers);
router.route("/removemembers").put(isAuthenticated, removeMember);
router.route("/leave/:id").delete(isAuthenticated, leaveGroup);
router
  .route("/message")
  .post(isAuthenticated, atachmentsMulter, sendAttachments);

router.route("/message/:id").get(isAuthenticated, getMessages);

router
  .route("/:id")
  .get(isAuthenticated, getChatDetails)
  .put(isAuthenticated, renameGroup)
  .delete(isAuthenticated, deleteChat);

export default router;
