const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");

// 📌 CRUD маршруты для задач
router.post("/", taskController.createTask); // Создать задачу
router.get("/", taskController.getTasks); // Получить все задачи
router.put("/:id", taskController.updateTask); // Обновить задачу
router.delete("/:id", taskController.deleteTask); // Удалить задачу

module.exports = router;
