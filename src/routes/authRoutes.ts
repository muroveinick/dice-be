import express from "express";
import * as authController from "../controllers/authController.js";
import * as authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/register", authController.register);
router.get("/me", authMiddleware.protect, authController.getMe);

router.get("/admin-only", authMiddleware.protect, authMiddleware.restrictTo("admin"), (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Admin access granted",
  });
});

export default router;
