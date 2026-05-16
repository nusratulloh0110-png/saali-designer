const token = process.env.TELEGRAM_BOT_TOKEN;
const siteUrl = process.argv[2] || process.env.SITE_URL || process.env.URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required.");
  process.exit(1);
}

if (!siteUrl) {
  console.error("Site URL is required. Example: node tools/setup-telegram-webhook.js https://example.netlify.app");
  process.exit(1);
}

const normalizedSiteUrl = siteUrl.replace(/\/$/, "");
const webhookUrl = `${normalizedSiteUrl}/.netlify/functions/telegram`;
const body = {
  url: webhookUrl,
  allowed_updates: ["message", "edited_message"],
};

if (secret) {
  body.secret_token = secret;
}

fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
})
  .then((response) => response.json())
  .then((data) => {
    if (!data.ok) {
      console.error(data);
      process.exit(1);
    }
    console.log(`Telegram webhook set: ${webhookUrl}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

