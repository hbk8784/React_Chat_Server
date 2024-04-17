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
import {
  addMemberValidator,
  deleteValidator,
  getChatDetailsValidator,
  getMessageValidator,
  leaveGroupValidator,
  newGroupValidator,
  removeMemberValidator,
  renameValidator,
  sendAttachmentValidator,
  validateHandler,
} from "../lib/validator.lib.js";

router.route("/new").post(
  isAuthenticated,
  // newGroupValidator(),
  // validateHandler,
  newGroupChat
);
router.route("/my").get(isAuthenticated, getMyChats);
router.route("/my/groups").get(isAuthenticated, getMyGroups);
router.route("/addmembers").put(
  isAuthenticated,
  // addMemberValidator(),
  // validateHandler,
  addMembers
);
router.route("/removemembers").put(
  isAuthenticated,
  // removeMemberValidator(),
  // validateHandler,
  removeMember
);
router.route("/leave/:id").delete(
  isAuthenticated,
  // leaveGroupValidator(),
  // validateHandler,
  leaveGroup
);
router.route("/message").post(
  isAuthenticated,
  atachmentsMulter,
  // sendAttachmentValidator(),
  // validateHandler,
  sendAttachments
);

router.route("/message/:id").get(
  isAuthenticated,
  // getMessageValidator(),
  // validateHandler,
  getMessages
);

router
  .route("/:id")
  .get(
    isAuthenticated,
    // getChatDetailsValidator(),
    // validateHandler,
    getChatDetails
  )
  .put(
    isAuthenticated,
    // renameValidator(),
    //  validateHandler,
    renameGroup
  )
  .delete(
    isAuthenticated,
    // deleteValidator(),
    // validateHandler,
    deleteChat
  );

export default router;
