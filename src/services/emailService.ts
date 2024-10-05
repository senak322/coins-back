import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Создаем переиспользуемый транспорт с настройками SMTP Яндекс Почты
const transporter = nodemailer.createTransport({
  host: "smtp.yandex.ru",
  port: 465,
  secure: true, // true для 465 порта
  auth: {
    user: process.env.YANDEX_EMAIL, // ваш email на Яндексе
    pass: process.env.YANDEX_PASSWORD, // пароль приложения или основной пароль
  },
});

interface MailOptions {
  subject: string;
  text?: string;
  html?: string;
}

// Функция для отправки письма
export const sendEmail = async (options: MailOptions) => {
//   console.log("YANDEX_EMAIL:", process.env.YANDEX_EMAIL);
//   console.log("YANDEX_PASSWORD:", process.env.YANDEX_PASSWORD);
  console.log("ADMIN_EMAIL:", process.env.ADMIN_EMAIL);
  try {
    const mailOptions = {
      from: `"Coins Change" <${process.env.YANDEX_EMAIL}>`, // От кого
      to: process.env.ADMIN_EMAIL, // Кому (email администратора)
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Письмо отправлено:", info.messageId);
  } catch (error) {
    console.error("Ошибка при отправке письма:", error);
  }
};
