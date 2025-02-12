const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

// 📌 CRUD маршруты для пользователей
router.post("/", userController.createUser); // Создать пользователя (регистрация)
router.get("/", userController.getAllUsers); // Получить всех пользователей
router.get("/:id", userController.getUserById); // Получить пользователя по ID
router.put("/:id", userController.updateUser); // Обновить пользователя
router.delete("/:id", userController.deleteUser); // Удалить пользователя

module.exports = router;
