import express from "express";
const app = express();
const router = express.Router();
import { singleAvatar } from "../middlewares/multer.middlewares.js";
import {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getMyNotifications,
  getMyFriends,
} from "../controllers/user.controllers.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import {
  loginValidator,
  registerValidator,
  validateHandler,
} from "../lib/validator.lib.js";

router.route("/login").post(login);
router.route("/new").post(
  singleAvatar,
  //  registerValidator()
  //  , validateHandler,
  newUser
);

//below routes are protected

// app.use(isAuthenticated);
router.route("/me").get(isAuthenticated, getMyProfile);
router.route("/logout").get(isAuthenticated, logout);
router.route("/search").get(isAuthenticated, searchUser);
router.route("/sendrequest").put(isAuthenticated, sendFriendRequest);
router.route("/accetprequest").put(isAuthenticated, acceptFriendRequest);
router.route("/notifications").get(isAuthenticated, getMyNotifications);
router.route("/friends").get(isAuthenticated, getMyFriends);

export default router;
