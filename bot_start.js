// استيراد مكتبة تيليجرام
const TelegramBot = require('node-telegram-bot-api');

// قم باستبدال الرمز المميز (توكن) الخاص بالبوت
const token = '8106225305:AAFIq9TuL1S_jl_LlFz34J0xn-WWBCQd7bE';

// قم بإنشاء كائن البوت
const bot = new TelegramBot(token, { polling: true });

// استبدل هذا الرابط برابط الواجهة الأمامية لتطبيقك على Vercel
const webAppUrl = 'https://mini-app-frontend-gamma.vercel.app/';

// هذا الكود يستمع لأمر /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // إرسال رسالة ترحيب مع زر "فتح التطبيق"
  bot.sendMessage(chatId, 'أهلاً بك! انقر على الزر أدناه لفتح التطبيق:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'فتح التطبيق',
            web_app: { url: webAppUrl }
          }
        ]
      ]
    }
  });
});