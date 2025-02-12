const TelegramBot = require("node-telegram-bot-api");
const Task = require("../models/task.model.js");
require("dotenv").config();

// 📌 Загружаем токен из `.env`
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// 📌 Объект для хранения пользователей
const users = {};

// 📌 Команда `/start` - Регистрация пользователя
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    users[chatId] = chatId; // Сохраняем ID пользователя

    bot.sendMessage(chatId, "Привет! Я бот-напоминалка. Я буду напоминать тебе о задачах с дедлайном.");
});

// 📌 Команда `/tasks` - Показывает список задач
bot.onText(/\/tasks/, async (msg) => {
    const chatId = msg.chat.id;
    const tasks = await Task.find(); // Задачи без фильтра (нужно привязать к пользователю)

    if (tasks.length === 0) {
        bot.sendMessage(chatId, "У тебя нет задач.");
        return;
    }

    let taskList = tasks.map(task => `📌 ${task.title} - дедлайн: ${new Date(task.deadline).toLocaleString()}`).join("\n");
    bot.sendMessage(chatId, taskList);
});

// 📌 Функция для отправки напоминаний
const sendTaskReminders = async () => {
    const now = new Date();
    const tasks = await Task.find({ deadline: { $lte: now } });

    for (const task of tasks) {
        for (const chatId in users) {
            bot.sendMessage(chatId, `⏰ Напоминание! Задача: ${task.title} уже просрочена!`);
        }
    }
};

// 📌 Запускаем проверку дедлайнов каждую минуту
setInterval(sendTaskReminders, 60 * 1000);

module.exports = bot;
