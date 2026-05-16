const { addProduct, clearSession, deleteProduct, getSession, readProducts, saveSession } = require("./catalog-store");

const CATEGORIES = {
  bags: "bags",
  bag: "bags",
  "сумка": "bags",
  "сумки": "bags",
  jewelry: "jewelry",
  "украшение": "jewelry",
  "украшения": "jewelry",
  accessories: "accessories",
  accessory: "accessories",
  "аксессуар": "accessories",
  "аксессуары": "accessories",
  decor: "decor",
  "декор": "decor",
  clothing: "clothing",
  clothes: "clothing",
  "одежда": "clothing",
};

const ADD_STEPS = [
  { key: "name_ru", question: "Название товара на русском?", parse: requiredText },
  { key: "name_uz", question: "Название на узбекском? Если такого нет, отправьте -", parse: optionalText, fallback: (data) => data.name_ru },
  { key: "category", question: "Категория? Напишите: сумки, украшения, аксессуары, декор или одежда.", parse: parseCategory },
  { key: "price", question: "Цена в сумах? Только число, например 320000.", parse: parseRequiredNumber },
  { key: "old_price", question: "Старая цена? Если нет, отправьте -", parse: parseOptionalNumber },
  { key: "description_ru", question: "Описание на русском?", parse: requiredText },
  {
    key: "description_uz",
    question: "Описание на узбекском? Если такого нет, отправьте -",
    parse: optionalText,
    fallback: (data) => data.description_ru,
  },
  { key: "material", question: "Материал?", parse: requiredText },
  { key: "size", question: "Размер? Например: 22 x 18 см. Если нет, отправьте -", parse: optionalText, fallback: () => "Уточняется" },
  {
    key: "image_url",
    question: "Ссылка на фото? Лучше прямая ссылка на картинку. Если фото пока нет, отправьте -",
    parse: parseImageUrl,
    fallback: () => "assets/images/placeholder.svg",
  },
  { key: "in_stock", question: "Товар в наличии? Ответьте: да или нет.", parse: parseBoolean },
  { key: "featured", question: "Показывать как избранное? Ответьте: да или нет.", parse: parseBoolean },
];

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

function env(name) {
  if (globalThis.Netlify?.env?.get) return Netlify.env.get(name);
  return process.env[name];
}

function requiredText(value) {
  const text = String(value || "").trim();
  if (!text || text === "-") return { ok: false, error: "Тут нужно значение. Напишите текст." };
  return { ok: true, value: text };
}

function optionalText(value) {
  const text = String(value || "").trim();
  if (!text || text === "-") return { ok: true, value: "" };
  return { ok: true, value: text };
}

function parseRequiredNumber(value) {
  const normalized = String(value || "").replace(/[^\d]/g, "");
  const number = Number(normalized);
  if (!number) return { ok: false, error: "Нужна цена числом. Например: 320000." };
  return { ok: true, value: number };
}

function parseOptionalNumber(value) {
  const text = String(value || "").trim();
  if (!text || text === "-") return { ok: true, value: "" };
  return parseRequiredNumber(text);
}

function parseCategory(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const category = CATEGORIES[normalized];
  if (!category) {
    return { ok: false, error: "Не понял категорию. Напишите: сумки, украшения, аксессуары, декор или одежда." };
  }
  return { ok: true, value: category };
}

function parseBoolean(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["да", "д", "yes", "y", "true", "1", "+"].includes(normalized)) return { ok: true, value: true };
  if (["нет", "н", "no", "n", "false", "0", "-"].includes(normalized)) return { ok: true, value: false };
  return { ok: false, error: "Ответьте, пожалуйста: да или нет." };
}

function parseImageUrl(value) {
  const text = String(value || "").trim();
  if (!text || text === "-") return { ok: true, value: "" };
  if (!/^https?:\/\//i.test(text)) return { ok: false, error: "Нужна ссылка, которая начинается с http:// или https://." };
  return { ok: true, value: text };
}

function getMessage(update) {
  return update.message || update.edited_message || null;
}

function getText(message) {
  return String(message?.text || "").trim();
}

function isAdmin(userId) {
  const admins = String(env("TELEGRAM_ADMIN_IDS") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return admins.includes(String(userId));
}

async function telegram(method, payload) {
  const token = env("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("Не настроен TELEGRAM_BOT_TOKEN.");

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok || !body.ok) {
    throw new Error(body.description || `Telegram API error ${response.status}`);
  }
  return body.result;
}

async function reply(chatId, text) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

async function safeReply(chatId, text) {
  try {
    await reply(chatId, text);
  } catch (error) {
    console.error("Unable to send Telegram reply.", error.message);
  }
}

function helpText(userId) {
  return [
    "Команды saali.designer:",
    "",
    "/add - добавить товар",
    "/delete - удалить товар по ID",
    "/delete 12 - удалить товар сразу по ID",
    "/list - показать товары и ID",
    "/cancel - отменить текущий ввод",
    "/help - показать помощь",
    "",
    `Ваш Telegram ID: ${userId}`,
  ].join("\n");
}

function productLine(product) {
  return `${product.id} - ${product.name_ru} (${product.price} сум)`;
}

async function listProducts(chatId) {
  const { products } = await readProducts();
  if (!products.length) {
    await reply(chatId, "Каталог пуст.");
    return;
  }

  await reply(chatId, ["Товары в каталоге:", "", ...products.map(productLine)].join("\n"));
}

async function startAdd(chatId, userId) {
  await saveSession(userId, "add", 0, {});
  await reply(chatId, `Добавляем новый товар.\n\n${ADD_STEPS[0].question}`);
}

async function handleAddAnswer(chatId, userId, text, session) {
  const step = ADD_STEPS[session.step];
  if (!step) {
    await clearSession(userId);
    await reply(chatId, "Сессия добавления устарела. Начните заново: /add");
    return;
  }

  const parsed = step.parse(text);
  if (!parsed.ok) {
    await reply(chatId, `${parsed.error}\n\n${step.question}`);
    return;
  }

  const data = {
    ...session.data,
    [step.key]: parsed.value || (step.fallback ? step.fallback(session.data) : parsed.value),
  };
  const nextStep = session.step + 1;

  if (nextStep < ADD_STEPS.length) {
    await saveSession(userId, "add", nextStep, data);
    await reply(chatId, ADD_STEPS[nextStep].question);
    return;
  }

  const product = await addProduct(data);
  await clearSession(userId);
  await reply(
    chatId,
    [
      "Готово, товар добавлен в каталог.",
      "",
      `ID: ${product.id}`,
      `Название: ${product.name_ru}`,
      `Категория: ${product.category}`,
      `Цена: ${product.price} сум`,
    ].join("\n")
  );
}

async function startDelete(chatId, userId, productId) {
  if (productId) {
    const deleted = await deleteProduct(productId);
    await reply(chatId, deleted ? `Удалил товар: ${deleted.name_ru} (ID: ${deleted.id}).` : `Не нашёл товар с ID ${productId}.`);
    return;
  }

  const { products } = await readProducts();
  if (!products.length) {
    await reply(chatId, "Каталог сейчас пуст, удалять пока нечего.");
    return;
  }

  await saveSession(userId, "delete", 0, {});
  await reply(chatId, ["Введите ID товара, который нужно удалить:", "", ...products.map(productLine)].join("\n"));
}

async function handleDeleteAnswer(chatId, userId, text) {
  const productId = String(text || "").trim();
  if (!productId || productId === "-") {
    await reply(chatId, "Нужен ID товара. Например: 12");
    return;
  }

  const deleted = await deleteProduct(productId);
  await clearSession(userId);
  await reply(chatId, deleted ? `Удалил товар: ${deleted.name_ru} (ID: ${deleted.id}).` : `Не нашёл товар с ID ${productId}.`);
}

function verifySecret(event) {
  const secret = env("TELEGRAM_WEBHOOK_SECRET");
  if (!secret) return true;
  const header = event.headers["x-telegram-bot-api-secret-token"] || event.headers["X-Telegram-Bot-Api-Secret-Token"];
  return header === secret;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(200, { ok: true, message: "Telegram webhook is ready." });
  }

  if (!verifySecret(event)) {
    return json(401, { ok: false, error: "Invalid Telegram webhook secret." });
  }

  let update;
  try {
    update = JSON.parse(event.body || "{}");
  } catch (error) {
    return json(400, { ok: false, error: "Invalid JSON." });
  }

  const message = getMessage(update);
  const chatId = message?.chat?.id;
  const userId = message?.from?.id;
  const text = getText(message);

  if (!message || !chatId || !userId) return json(200, { ok: true, skipped: true });

  try {
    if (!isAdmin(userId)) {
      await reply(
        chatId,
        [
          "У вас пока нет доступа к управлению каталогом.",
          `Ваш Telegram ID: ${userId}`,
          "Добавьте этот ID в переменную TELEGRAM_ADMIN_IDS на Netlify.",
        ].join("\n")
      );
      return json(200, { ok: true });
    }

    const session = await getSession(userId);
    const [rawCommand, commandArg] = text.split(/\s+/, 2);
    const command = rawCommand.split("@")[0];

    if (command === "/start" || command === "/help") {
      await reply(chatId, helpText(userId));
      return json(200, { ok: true });
    }

    if (command === "/cancel") {
      await clearSession(userId);
      await reply(chatId, "Ок, отменил текущий ввод.");
      return json(200, { ok: true });
    }

    if (command === "/add") {
      await startAdd(chatId, userId);
      return json(200, { ok: true });
    }

    if (command === "/delete") {
      await startDelete(chatId, userId, commandArg);
      return json(200, { ok: true });
    }

    if (command === "/list") {
      await listProducts(chatId);
      return json(200, { ok: true });
    }

    if (session?.action === "add") {
      await handleAddAnswer(chatId, userId, text, session);
      return json(200, { ok: true });
    }

    if (session?.action === "delete") {
      await handleDeleteAnswer(chatId, userId, text);
      return json(200, { ok: true });
    }

    await reply(chatId, "Напишите /add, чтобы добавить товар, или /delete, чтобы удалить товар.");
    return json(200, { ok: true });
  } catch (error) {
    console.error(error);
    await safeReply(chatId, `Ошибка: ${error.message}`);
    return json(200, { ok: false, error: error.message });
  }
};
