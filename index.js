require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const solarlunar = require("solarlunar");

const CHAT_ID = 6049331143;

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const giolist = [
  { name: "Giỗ ông ngoại", lunar: { day: 4, month: 2 } },
  { name: "Giỗ mẹ", lunar: { day: 14, month: 5 } },
  { name: "Giỗ bà ngoại", lunar: { day: 9, month: 12 } },
];

// ĐỔI ÂM → DƯƠNG (FIX ĐÚNG)
function lunarToSolar(lunarDay, lunarMonth, solarYear) {
  let lunarYear = solarYear;
  if (lunarMonth >= 11) lunarYear = solarYear - 1;

  const r = solarlunar.lunar2solar(lunarYear, lunarMonth, lunarDay, false);

  return r;
}

// GÕ "gio" ĐỂ XEM
bot.onText(/gio/i, (msg) => {
  const year = new Date().getFullYear();
  let text = `📅 Ngày giỗ năm ${year}:\n\n`;

  giolist.forEach((g) => {
    const r = lunarToSolar(g.lunar.day, g.lunar.month, year);
    text += `• ${g.name}: ${r.cDay}/${r.cMonth}/${r.cYear}\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

// 🔔 CRON – TỰ THÔNG BÁO 7H SÁNG
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
        `🔔 Hôm nay là ${g.name} (${g.lunar.day}/${g.lunar.month} âm)`,
      );
    }
  });
});

console.log("🤖 Bot đang chạy & sẽ tự nhắc giỗ");
