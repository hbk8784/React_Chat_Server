import express from "express";
const app = express();
const router = express.Router();
import {
  getAllUsers,
  getAllChat,
  getAllMessages,
  getDashboardStats,
  adminLogin,
  adminLogout,
  getAdminData,
} from "../controllers/admin.controller.js";
import { adminOnly } from "../middlewares/auth.middleware.js";

router.route("/logout").get(adminLogout);
router.route("/verify").post(adminLogin);

router.route("/").get(adminOnly, getAdminData);
router.route("/chats").get(adminLogin, getAllChat);
router.route("/users").get(adminOnly, getAllUsers);
router.route("/messages").get(adminOnly, getAllMessages);
router.route("/stats").get(adminOnly, getDashboardStats);

export default router;
