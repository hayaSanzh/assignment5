const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller.js");

// 📌 Регистрация
router.get("/register", (req, res) => res.render("register"));
router.post("/register", authController.register);

// 📌 Вход
router.get("/login", (req, res) => res.render("login"));
router.post("/login", authController.login);

// 📌 Выход
router.get("/logout", authController.logout);

module.exports = router;
