const User = require("../models/user.model.js");

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Проверяем, есть ли пользователь
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash("error_msg", "Этот email уже зарегистрирован!");
            return res.redirect("/register");
        }

        // Создаем нового пользователя
        const newUser = new User({ username, email, password });
        await newUser.save();

        req.flash("success_msg", "Регистрация успешна! Теперь войдите.");
        res.redirect("/login");
    } catch (err) {
        req.flash("error_msg", "Ошибка регистрации.");
        res.redirect("/register");
    }
};

const bcrypt = require("bcrypt");

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            req.flash("error_msg", "Пользователь не найден!");
            return res.redirect("/login");
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash("error_msg", "Неверный пароль!");
            return res.redirect("/login");
        }



        if (user.twoFAEnabled) {
            req.session.tempUser = user;
            return res.redirect("/2fa-verify");
        } else {
            req.session.user = user;
            req.flash("success_msg", "Вы вошли в систему!");
            res.redirect("/");
        }   
    } catch (err) {
        req.flash("error_msg", "Ошибка авторизации.");
        res.redirect("/login");
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
};
