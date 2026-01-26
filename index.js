require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const solarlunar = require("solarlunar");

// 👉 CHAT_ID: có thể hardcode hoặc dùng /chatid để lấy
const CHAT_ID = 6049331143;

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const giolist = [
  { name: "Giỗ ông ngoại", lunar: { day: 4, month: 2 } },
  { name: "Giỗ mẹ", lunar: { day: 14, month: 5 } },
  { name: "Giỗ bà ngoại", lunar: { day: 9, month: 12 } },
];

// ================== UTILS ==================
function lunarToSolar(lunarDay, lunarMonth, solarYear) {
  let lunarYear = solarYear;
  if (lunarMonth >= 11) lunarYear = solarYear - 1;

  return solarlunar.lunar2solar(lunarYear, lunarMonth, lunarDay, false);
}

function daysBetween(from, to) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.ceil((to - from) / oneDay);
}

// ================== COMMANDS ==================

// 👉 Lấy chat_id (dùng 1 lần là đủ)
bot.onText(/\/chatid/i, (msg) => {
  bot.sendMessage(msg.chat.id, `🆔 Chat ID của bạn là:\n${msg.chat.id}`);
});

// 👉 Xem ngày giỗ dương lịch
bot.onText(/gio/i, (msg) => {
  const year = new Date().getFullYear();
  let text = `📅 Ngày giỗ năm ${year}:\n\n`;

  giolist.forEach((g) => {
    const r = lunarToSolar(g.lunar.day, g.lunar.month, year);
    text += `• ${g.name}: ${r.cDay}/${r.cMonth}/${r.cYear}\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

// 👉 Xem còn bao nhiêu ngày
bot.onText(/ngay/i, (msg) => {
  const today = new Date();
  const currentYear = today.getFullYear();

  let text = "⏳ Số ngày còn lại tới các ngày giỗ:\n\n";

  giolist.forEach((g) => {
    let r = lunarToSolar(g.lunar.day, g.lunar.month, currentYear);
    let gioDate = new Date(r.cYear, r.cMonth - 1, r.cDay);

    if (gioDate < today) {
      r = lunarToSolar(g.lunar.day, g.lunar.month, currentYear + 1);
      gioDate = new Date(r.cYear, r.cMonth - 1, r.cDay);
    }

    const daysLeft = daysBetween(today, gioDate);

    text += `• ${g.name}: còn ${daysLeft} ngày (${r.cDay}/${r.cMonth}/${r.cYear})\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

// ================== CRON ==================
// 🔔 Nhắc giỗ lúc 7h sáng mỗi ngày
cron.schedule("0 7 * * *", () => {
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();

  giolist.forEach((g) => {
    const r = lunarToSolar(g.lunar.day, g.lunar.month, y);

    if (r.cDay === d && r.cMonth === m && r.cYear === y) {
      bot.sendMessage(
        CHAT_ID,
        `🔔 Hôm nay là ${g.name} (${g.lunar.day}/${g.lunar.month} âm lịch)`,
      );
    }
  });
});

console.log("🤖 Bot đang chạy – nhắc giỗ tự động lúc 7h");
