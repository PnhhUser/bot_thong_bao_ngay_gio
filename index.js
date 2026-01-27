require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const solarlunar = require("solarlunar");

// ================== CONFIG ==================
let CHAT_ID = null;

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Danh sách ngày giỗ (âm lịch)
const giolist = [
  { name: "Giỗ ông ngoại", lunar: { day: 30, month: 12 } },
  { name: "Giỗ mẹ", lunar: { day: 15, month: 5 } },
  { name: "Giỗ bà ngoại", lunar: { day: 9, month: 12 } },
];

// ================== UTILS ==================

// Chuyển âm → dương (fallback nhiều bước, KHÔNG BAO GIỜ undefined)
function lunarToSolar(lunarDay, lunarMonth, solarYear) {
  let lunarYear = solarYear;
  if (lunarMonth >= 11) lunarYear = solarYear - 1;

  let day = lunarDay;
  let result = null;

  while (day > 0 && !result) {
    result = solarlunar.lunar2solar(lunarYear, lunarMonth, day, false);
    if (!result) day--;
  }

  return result; // có thể null nếu dữ liệu sai hoàn toàn
}

function daysBetween(from, to) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.ceil((to - from) / oneDay);
}

// Lấy ngày giỗ sắp tới (năm hiện tại hoặc năm sau)
function getNextGioDate(gio) {
  const today = new Date();
  let year = today.getFullYear();

  let r = lunarToSolar(gio.lunar.day, gio.lunar.month, year);
  if (!r) return null;

  let gioDate = new Date(r.cYear, r.cMonth - 1, r.cDay);

  if (gioDate < today) {
    r = lunarToSolar(gio.lunar.day, gio.lunar.month, year + 1);
    if (!r) return null;
    gioDate = new Date(r.cYear, r.cMonth - 1, r.cDay);
  }

  return { r, gioDate };
}

// ================== COMMAND HANDLER ==================
bot.on("message", (msg) => {
  if (!msg.text) return;
  if (/^(gio|ngay|\/chatid|\/start)/i.test(msg.text)) return;

  bot.sendMessage(msg.chat.id, "ℹ️ Gõ /start để xem hướng dẫn sử dụng bot");
});

bot.onText(/\/start/i, (msg) => {
  const text = `
🤖 *Bot Nhắc Ngày Giỗ (Âm → Dương)*

📌 *Lệnh sử dụng*:
• /chatid → Kích hoạt bot
• gio → Xem ngày giỗ năm nay
• ngay → Xem còn bao nhiêu ngày

⏰ *Giờ nhắc*: 7h, 11h, 21h, 21h35, 23h

🙏 Dùng để ghi nhớ & tưởng niệm người thân
`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

bot.onText(/\/chatid/i, (msg) => {
  CHAT_ID = msg.chat.id;
  bot.sendMessage(CHAT_ID, `✅ Bot đã ghi nhớ Chat ID:\n${CHAT_ID}`);
});

bot.onText(/gio/i, (msg) => {
  const year = new Date().getFullYear();
  let text = `📅 Ngày giỗ năm ${year}:\n\n`;

  giolist.forEach((g) => {
    const r = lunarToSolar(g.lunar.day, g.lunar.month, year);

    if (!r) {
      text += `• ${g.name}: ❌ Không xác định\n`;
      return;
    }

    text += `• ${g.name}: ${r.cDay}/${r.cMonth}/${r.cYear}\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

bot.onText(/ngay/i, (msg) => {
  const today = new Date();
  let text = "⏳ Số ngày còn lại tới các ngày giỗ:\n\n";

  giolist.forEach((g) => {
    const data = getNextGioDate(g);

    if (!data) {
      text += `• ${g.name}: ❌ Không xác định\n`;
      return;
    }

    const daysLeft = daysBetween(today, data.gioDate);
    text += `• ${g.name}: còn ${daysLeft} ngày (${data.r.cDay}/${data.r.cMonth}/${data.r.cYear})\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

// ================== CRON JOB ==================
function remindJob() {
  if (!CHAT_ID) return;

  const today = new Date();

  giolist.forEach((g) => {
    const data = getNextGioDate(g);
    if (!data) return;

    const daysLeft = daysBetween(today, data.gioDate);

    if (daysLeft >= 0 && daysLeft <= 3) {
      const label =
        daysLeft === 0 ? "🔔 HÔM NAY" : `⏰ Còn ${daysLeft} ngày`;

      bot.sendMessage(
        CHAT_ID,
        `${label} tới ${g.name}\n📅 ${data.r.cDay}/${data.r.cMonth}/${data.r.cYear} (âm ${g.lunar.day}/${g.lunar.month})`
      );
    }
  });
}

// ⏰ Lịch nhắc
cron.schedule("0 7,11,21,23 * * *", remindJob, {
  timezone: "Asia/Ho_Chi_Minh",
});

cron.schedule("35 21 * * *", remindJob, {
  timezone: "Asia/Ho_Chi_Minh",
});
