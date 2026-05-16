# Telegram Bot Setup

Бот управляет каталогом через Netlify Blobs.

## Команды

- `/add` - добавить товар по вопросам.
- `/delete` - удалить товар по ID.
- `/delete 12` - удалить товар сразу по ID.
- `/list` - показать товары и ID.
- `/cancel` - отменить текущий ввод.
- `/help` - помощь и ваш Telegram ID.

## Netlify Environment Variables

Добавьте в Netlify:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_IDS=123456789
TELEGRAM_WEBHOOK_SECRET=
```

`TELEGRAM_ADMIN_IDS` можно узнать, написав боту `/start`: бот покажет ваш ID.
Токен бота не хранится в коде и не должен попадать в репозиторий.

## Webhook

После деплоя установите webhook:

```powershell
$env:TELEGRAM_BOT_TOKEN="..."
$env:TELEGRAM_WEBHOOK_SECRET="..."
node tools/setup-telegram-webhook.js https://your-site.netlify.app
```

Если токен был отправлен в чат или попал в чужие руки, перевыпустите его в BotFather.
