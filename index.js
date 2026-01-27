require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const solarlunar = require("solarlunar");

// ================== CONFIG ==================
let CHAT_ID = null;

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const giolist = [
  { name: "Giỗ ông ngoại", lunar: { day: 30, month: 12 } },
  { name: "Giỗ mẹ", lunar: { day: 15, month: 5 } },
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
bot.on("message", (msg) => {
  if (!msg.text) return;
  if (/^(gio|ngay|\/chatid|\/start)/i.test(msg.text)) return;

  bot.sendMessage(msg.chat.id, "ℹ️ Gõ /start để xem hướng dẫn sử dụng bot");
});

bot.onText(/\/start/i, (msg) => {
  const text = `
🤖 *Bot Nhắc Ngày Giỗ (Âm → Dương)*

Bot giúp bạn:
• Tự động đổi ngày giỗ âm sang dương
• Nhắc trước 1–3 ngày
• Nhắc nhiều khung giờ trong ngày

📌 *Hướng dẫn sử dụng*:
1️⃣ Gõ */chatid*
→ Bot sẽ ghi nhớ để gửi thông báo cho bạn

2️⃣ Gõ *gio*
→ Xem ngày giỗ năm hiện tại (dương lịch)

3️⃣ Gõ *ngay*
→ Xem còn bao nhiêu ngày tới ngày giỗ

⏰ *Thời gian nhắc*:
• 7h sáng
• 11h trưa
• 9h tối
• 11h tối

⚠️ *Lưu ý*:
Bot chỉ nhắc sau khi bạn đã gõ */chatid*

🙏 Dùng để ghi nhớ & tưởng niệm người thân
`;

  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

bot.onText(/\/chatid/i, (msg) => {
  CHAT_ID = msg.chat.id;
  bot.sendMessage(
    CHAT_ID,
    `🆔 Chat ID của bạn là:\n${CHAT_ID}\n\n✅ Bot sẽ dùng ID này để nhắc giỗ`,
  );
});

bot.onText(/gio/i, (msg) => {
  const year = new Date().getFullYear();
  let text = `📅 Ngày giỗ năm ${year}:\n\n`;

  giolist.forEach((g) => {
    const r = lunarToSolar(g.lunar.day, g.lunar.month, year);
    text += `• ${g.name}: ${r.cDay}/${r.cMonth}/${r.cYear}\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

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

// ================== CRON JOB ==================
function remindJob() {
  if (!CHAT_ID) return;

  const today = new Date();
  const year = today.getFullYear();

  giolist.forEach((g) => {
    let r = lunarToSolar(g.lunar.day, g.lunar.month, year);
    let gioDate = new Date(r.cYear, r.cMonth - 1, r.cDay);

    if (gioDate < today) {
      r = lunarToSolar(g.lunar.day, g.lunar.month, year + 1);
      gioDate = new Date(r.cYear, r.cMonth - 1, r.cDay);
    }

    const daysLeft = daysBetween(today, gioDate);

    if (daysLeft >= 0 && daysLeft <= 3) {
      let label = daysLeft === 0 ? "🔔 HÔM NAY" : `⏰ Còn ${daysLeft} ngày`;

      bot.sendMessage(
        CHAT_ID,
        `${label} tới ${g.name}\n📅 ${r.cDay}/${r.cMonth}/${r.cYear} (âm ${g.lunar.day}/${g.lunar.month})`,
      );
    }
  });
}

// ⏰ 7h, 11h, 21h, 21h35, 23h
cron.schedule("0 7,11,21,23 * * *", remindJob, {
  timezone: "Asia/Ho_Chi_Minh",
});

cron.schedule("35 21 * * *", remindJob, {
  timezone: "Asia/Ho_Chi_Minh",
});
