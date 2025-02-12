const User = require("../models/user.model");
const bcrypt = require("bcrypt");

// 📌 1. Создать пользователя (Register)
exports.createUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Этот email уже зарегистрирован" });
    }

    // Создаем нового пользователя
    const user = new User({ username, email, password });
    await user.save();

    res.status(201).json({ message: "Пользователь создан!", user });
  } catch (err) {
    res.status(500).json({ error: "Ошибка при создании пользователя" });
  }
};

// 📌 2. Получить всех пользователей (Read)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Убираем пароли из вывода
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Ошибка загрузки пользователей" });
  }
};

// 📌 3. Получить одного пользователя по ID (Read)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Ошибка загрузки пользователя" });
  }
};

// 📌 4. Обновить пользователя (Update)
exports.updateUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Обновляем данные
    let updateData = { username, email };
    
    // Если пароль передан, хешируем его
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    res.json({ message: "Пользователь обновлен!", user });
  } catch (err) {
    res.status(500).json({ error: "Ошибка обновления пользователя" });
  }
};

// 📌 5. Удалить пользователя (Delete)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    res.json({ message: "Пользователь удален!" });
  } catch (err) {
    res.status(500).json({ error: "Ошибка удаления пользователя" });
  }
};
