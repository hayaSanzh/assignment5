const Task = require("../models/task.model");

// 📌 1. Создать задачу (Create)
exports.createTask = async (req, res) => {
    try {
      const { title, description, deadline } = req.body;
      
      if (!title) return res.status(400).json({ error: "Название задачи обязательно!" });
      
      const newTask = new Task({ title, description, deadline, user: req.user.id });
      await newTask.save();
      
      res.status(201).json({ message: "Задача создана!", task: newTask });
    } catch (err) {
      res.status(500).json({ error: "Ошибка создания задачи" });
    }
  };
  

// 📌 2. Получить все задачи пользователя (Read)
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Ошибка загрузки задач" });
  }
};

// 📌 3. Обновить задачу (Update)
exports.updateTask = async (req, res) => {
  try {
    const { title, description, deadline, completed } = req.body;
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, 
      { title, description, deadline, completed }, 
      { new: true }
    );
    if (!task) return res.status(404).json({ error: "Задача не найдена" });

    res.json({ message: "Задача обновлена!", task });
  } catch (err) {
    res.status(500).json({ error: "Ошибка обновления задачи" });
  }
};

// 📌 4. Удалить задачу (Delete)
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ error: "Задача не найдена" });

    res.json({ message: "Задача удалена!" });
  } catch (err) {
    res.status(500).json({ error: "Ошибка удаления задачи" });
  }
};
