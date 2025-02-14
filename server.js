require("dotenv").config();
const express    = require("express");
const mongoose   = require("mongoose");
const session    = require("express-session");
const flash      = require("connect-flash");
const Task       = require("./models/task.model.js");
const authRoutes = require("./routes/auth.routes.js");
const bot        = require("./controllers/notification.controller.js"); // Подключаем бота

// Подключаем новые зависимости для 2FA
const speakeasy = require("speakeasy");
const qrcode    = require("qrcode");

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("client"));

// 📌 Подключение к MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Подключено к MongoDB"))
  .catch(err => console.error("❌ Ошибка подключения:", err));

// 📌 Настройка сессий и flash-сообщений
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false
  })
);
app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg   = req.flash("error_msg");
  res.locals.user        = req.session.user || null;
  next();
});

// 📌 Middleware для проверки аутентификации
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash("error_msg", "Сначала войдите в систему!");
    return res.redirect("/login");
  }
  next();
};

app.get("/", requireAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.session.user._id });
    res.render("layout", {
      content: `<h2>📌 Мои задачи</h2>
        <ul>${tasks
          .map(
            task => `
          <li>
            <strong>${task.title}</strong> - ${
              task.deadline ? new Date(task.deadline).toLocaleString() : "Без дедлайна"
            }
            <a href="/edit/${task._id}">✏️</a>
            <form action="/delete/${task._id}" method="POST" style="display:inline;">
              <button type="submit">🗑 Удалить</button>
            </form>
          </li>`
          )
          .join("")}
        </ul>
        <a href="/create">➕ Добавить задачу</a>
        <br>
        <!-- Ссылка для настройки 2FA (если ещё не настроено) -->
        <a href="/2fa-setup">⚙️ Настроить 2FA</a>`
    });
  } catch (err) {
    res.status(500).send("Ошибка загрузки задач");
  }
});

const User = require("./models/user.model.js");

app.get("/2fa-setup", requireAuth, async (req, res) => {
  // Загружаем пользователя из БД, чтобы проверить, включена ли 2FA
  const user = await User.findById(req.session.user._id);
  console.log(user);
  if (user.twoFAEnabled) {
    req.flash("error_msg", "Двухфакторная аутентификация уже настроена.");
    return res.redirect("/");
  }
  // Генерируем секрет для TOTP
  const secret = speakeasy.generateSecret({
    name: `MyApp (${user.email})`
  });
  // Сохраняем секрет во временной сессии до подтверждения
  req.session.tempTwoFASecret = secret.base32;

  // Генерируем QR-код для otpauth URL
  qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
    if (err) {
      req.flash("error_msg", "Ошибка генерации QR-кода.");
      return res.redirect("/");
    }
    res.render("layout", {
      content: `
        <h2>Настройка двухфакторной аутентификации</h2>
        <p>Отсканируйте этот QR-код в Google Authenticator или введите секрет вручную:</p>
        <p><strong>${secret.base32}</strong></p>
        <img src="${data_url}" alt="QR Code">
        <form action="/2fa-setup" method="POST">
          <input type="text" name="token" placeholder="Введите код из приложения" required>
          <button type="submit">Подтвердить</button>
        </form>
      `
    });
  });
});

// Обработка подтверждения настройки 2FA
app.post("/2fa-setup", requireAuth, async (req, res) => {
  const { token } = req.body;
  const tempSecret = req.session.tempTwoFASecret;
  if (!tempSecret) {
    req.flash("error_msg", "Секрет не найден, попробуйте ещё раз.");
    return res.redirect("/2fa-setup");
  }
  // Проверяем введённый TOTP-код
  const verified = speakeasy.totp.verify({
    secret: tempSecret,
    encoding: "base32",
    token: token,
    window: 1
  });
  if (verified) {
    // Сохраняем настройки 2FA в БД для пользователя
    await User.findByIdAndUpdate(req.session.user._id, {
      twoFAEnabled: true,
      twoFASecret: tempSecret
    });
    // Обновляем данные пользователя в сессии
    req.session.user.twoFAEnabled = true;
    req.session.user.twoFASecret  = tempSecret;
    delete req.session.tempTwoFASecret;
    req.flash("success_msg", "Двухфакторная аутентификация успешно настроена!");
    return res.redirect("/");
  } else {
    req.flash("error_msg", "Неверный код. Попробуйте снова.");
    return res.redirect("/2fa-setup");
  }
});

app.get("/2fa-verify", (req, res) => {
  if (!req.session.tempUser) {
    return res.redirect("/login");
  }
  res.render("layout", {
    content: `
      <h2>Двухфакторная аутентификация</h2>
      <form action="/2fa-verify" method="POST">
        <input type="text" name="token" placeholder="Введите код из Google Authenticator" required>
        <button type="submit">Проверить</button>
      </form>
    `
  });
});

app.post("/2fa-verify", async (req, res) => {
  if (!req.session.tempUser) {
    return res.redirect("/login");
  }
  const token = req.body.token;
  const user = await User.findById(req.session.tempUser._id);
  if (!user || !user.twoFAEnabled || !user.twoFASecret) {
    req.flash("error_msg", "Ошибка настройки двухфакторной аутентификации.");
    return res.redirect("/login");
  }
  // Проверяем TOTP-код, используя секрет из БД
  const verified = speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: "base32",
    token: token,
    window: 1
  });
  if (verified) {
    req.session.user = user;
    delete req.session.tempUser;
    req.flash("success_msg", "Двухфакторная аутентификация пройдена успешно!");
    res.redirect("/");
  } else {
    req.flash("error_msg", "Неверный код. Попробуйте снова.");
    res.redirect("/2fa-verify");
  }
});

app.use(authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на http://localhost:${PORT}`));
