// استيراد مكتبة تيليجرام
const TelegramBot = require('node-telegram-bot-api');

// ضع API Token الخاص بك هنا
const token = '8106225305:AAFIq9TuL1S_jl_LlFz34J0xn-WWBCQd7bE';

// قم بإنشاء كائن بوت جديد
const bot = new TelegramBot(token, { polling: true });

// ضع رابط تطبيق الويب الخاص بك هنا
const webAppUrl = 'https://mini-app-frontend-gamma.vercel.app/';

// معالجة أي رسالة
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // إنشاء زر "فتح التطبيق"
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ 
          text: '🚀 فتح التطبيق', 
          web_app: { url: webAppUrl } 
        }]
      ]
    }
  };
  
  // إرسال رسالة الترحيب
  bot.sendMessage(chatId, 'أهلاً بك! انقر على الزر أدناه لفتح التطبيق:', opts);
});

console.log('Bot is running...');