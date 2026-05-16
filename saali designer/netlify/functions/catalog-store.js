const FALLBACK_PRODUCTS = require("../../assets/data/products.json");

const STORE_NAME = "saali-catalog";
const PRODUCTS_KEY = "products";
const SESSIONS_KEY = "telegram-sessions";
const PLACEHOLDER_IMAGE = "assets/images/placeholder.svg";

function parseNumber(value) {
  if (typeof value === "number") return value;
  const normalized = String(value ?? "").replace(/[^\d.-]/g, "");
  return Number(normalized) || 0;
}

function isTruthy(value) {
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "да", "ha"].includes(String(value ?? "").trim().toLowerCase());
}

function convertDriveImage(url) {
  const value = String(url || "").trim();
  if (!value) return PLACEHOLDER_IMAGE;

  const fileMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w900`;
  }

  const idMatch = value.match(/[?&]id=([^&]+)/);
  if (value.includes("drive.google.com") && idMatch) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w900`;
  }

  return value;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function shouldLogBlobWarning(error) {
  return !/environment has not been configured|deployID|siteID|token/i.test(error.message || "");
}

async function resolveIbbImage(url) {
  const value = String(url || "").trim();
  if (!/^https:\/\/ibb\.co\//i.test(value)) return value;

  try {
    const imageResponse = await fetch(value, {
      headers: { "user-agent": "saali-designer-catalog/1.0" },
    });
    if (!imageResponse.ok) return value;

    const html = await imageResponse.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    return match ? decodeHtml(match[1]) : value;
  } catch (error) {
    console.warn("Unable to resolve ibb.co image URL", error.message);
    return value;
  }
}

function normalizeProduct(raw) {
  return {
    id: raw.id || `item-${Math.random().toString(36).slice(2, 10)}`,
    name_ru: raw.name_ru || raw.name || "Изделие saali.designer",
    name_uz: raw.name_uz || raw.name_ru || raw.name || "saali.designer buyumi",
    category: raw.category || "accessories",
    price: parseNumber(raw.price),
    old_price: raw.old_price ? parseNumber(raw.old_price) : "",
    description_ru: raw.description_ru || "Авторское изделие ручной работы с этническими мотивами.",
    description_uz: raw.description_uz || raw.description_ru || "Etnik motivlarga ega mualliflik qo'l mehnati buyumi.",
    material: raw.material || "Ручная работа",
    size: raw.size || "Уточняется",
    image_url: convertDriveImage(raw.image_url),
    in_stock: raw.in_stock === undefined ? true : isTruthy(raw.in_stock),
    featured: isTruthy(raw.featured),
  };
}

async function prepareProducts(products) {
  const normalized = products.map(normalizeProduct).filter((product) => product.id && product.name_ru && product.price);
  return Promise.all(
    normalized.map(async (product) => ({
      ...product,
      image_url: await resolveIbbImage(product.image_url),
    }))
  );
}

async function getBlobStore() {
  const { getDeployStore, getStore } = await import("@netlify/blobs");
  const deployContext = globalThis.Netlify?.context?.deploy?.context || process.env.CONTEXT;

  if (deployContext === "production") {
    return getStore(STORE_NAME, { consistency: "strong" });
  }

  return getDeployStore(STORE_NAME);
}

async function readProducts() {
  try {
    const store = await getBlobStore();
    const products = await store.get(PRODUCTS_KEY, { type: "json" });
    if (Array.isArray(products) && products.length) {
      return { products: await prepareProducts(products), source: "netlify-blobs" };
    }
  } catch (error) {
    if (shouldLogBlobWarning(error)) {
      console.warn("Netlify Blobs catalog unavailable, static fallback is active.", error.message);
    }
  }

  return { products: await prepareProducts(FALLBACK_PRODUCTS), source: "static-fallback" };
}

async function writeProducts(products) {
  const store = await getBlobStore();
  const prepared = await prepareProducts(products);
  await store.setJSON(PRODUCTS_KEY, prepared);
  return prepared;
}

function nextProductId(products) {
  const maxId = products.reduce((max, product) => {
    const numericId = Number(product.id);
    return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
  }, 0);
  return maxId + 1;
}

async function addProduct(data) {
  const { products } = await readProducts();
  const product = normalizeProduct({
    ...data,
    id: nextProductId(products),
  });
  await writeProducts([...products, product]);
  return product;
}

async function deleteProduct(productId) {
  const { products } = await readProducts();
  const index = products.findIndex((product) => String(product.id).trim() === String(productId).trim());
  if (index === -1) return null;

  const [deleted] = products.splice(index, 1);
  await writeProducts(products);
  return deleted;
}

async function readSessions() {
  try {
    const store = await getBlobStore();
    const sessions = await store.get(SESSIONS_KEY, { type: "json" });
    return sessions && typeof sessions === "object" ? sessions : {};
  } catch (error) {
    if (shouldLogBlobWarning(error)) {
      console.warn("Telegram sessions are unavailable.", error.message);
    }
    return {};
  }
}

async function writeSessions(sessions) {
  const store = await getBlobStore();
  await store.setJSON(SESSIONS_KEY, sessions);
}

async function getSession(userId) {
  const sessions = await readSessions();
  return sessions[String(userId)] || null;
}

async function saveSession(userId, action, step, data) {
  const sessions = await readSessions();
  sessions[String(userId)] = { action, step, data, updated_at: new Date().toISOString() };
  await writeSessions(sessions);
}

async function clearSession(userId) {
  const sessions = await readSessions();
  delete sessions[String(userId)];
  await writeSessions(sessions);
}

module.exports = {
  addProduct,
  clearSession,
  deleteProduct,
  getSession,
  readProducts,
  saveSession,
};
