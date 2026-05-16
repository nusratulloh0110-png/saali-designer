const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const errors = [];
const warnings = [];

const requiredFiles = [
  "index.html",
  "catalog.html",
  "manifest.webmanifest",
  "netlify.toml",
  "assets/css/main.css",
  "assets/css/landing.css",
  "assets/css/catalog.css",
  "assets/js/utils.js",
  "assets/js/landing.js",
  "assets/js/catalog.js",
  "assets/data/products.json",
  "netlify/functions/catalog.js",
  "netlify/functions/catalog-store.js",
  "netlify/functions/telegram.js",
  "tools/setup-telegram-webhook.js",
];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function stripAssetUrl(value) {
  return value.split("#")[0].split("?")[0];
}

function validateRequiredFiles() {
  requiredFiles.forEach((file) => {
    if (!exists(file)) fail(`Missing required file: ${file}`);
  });
}

function validateJson() {
  let products;
  try {
    products = JSON.parse(read("assets/data/products.json"));
  } catch (error) {
    fail(`assets/data/products.json is not valid JSON: ${error.message}`);
    return;
  }

  if (!Array.isArray(products) || products.length === 0) {
    fail("assets/data/products.json must contain at least one fallback product");
    return;
  }

  const categories = new Set(["bags", "jewelry", "accessories", "decor", "clothing"]);
  products.forEach((product, index) => {
    const label = `Product ${index + 1}`;
    if (!product.id) fail(`${label}: missing id`);
    if (!product.name_ru) fail(`${label}: missing name_ru`);
    if (!product.category) fail(`${label}: missing category`);
    if (!categories.has(product.category)) warn(`${label}: unknown category "${product.category}"`);
    if (!Number(product.price)) fail(`${label}: price must be a positive number`);
    if (String(product.image_url || "").startsWith("https://ibb.co/")) {
      warn(`${label}: ibb.co page URLs are not direct image URLs; use i.ibb.co or Google Drive sharing links when possible`);
    }
  });
}

function validateAssetReferences() {
  ["index.html", "catalog.html", "manifest.webmanifest"].forEach((file) => {
    const text = read(file);
    const matches = text.matchAll(/(?:href|src|content)=["']([^"']+)["']/g);
    for (const match of matches) {
      const url = match[1];
      if (!url.startsWith("assets/") && url !== "manifest.webmanifest") continue;

      const asset = stripAssetUrl(url);
      if (!exists(asset)) fail(`${file}: referenced asset does not exist: ${url}`);
    }
  });
}

function validateBuildConfig() {
  const netlifyConfig = read("netlify.toml");
  if (!netlifyConfig.includes("tools/validate-project.js")) {
    fail("netlify.toml build command must run tools/validate-project.js");
  }
  if (!netlifyConfig.includes('from = "/catalog"')) {
    fail("netlify.toml is missing /catalog redirect");
  }
}

async function validateFunctionFallback() {
  const { handler } = require(path.join(root, "netlify/functions/catalog.js"));
  const result = await handler();
  if (result.statusCode !== 200) {
    fail(`catalog function fallback returned ${result.statusCode}`);
    return;
  }

  let body;
  try {
    body = JSON.parse(result.body);
  } catch (error) {
    fail(`catalog function did not return JSON: ${error.message}`);
    return;
  }

  if (!Array.isArray(body.products) || body.products.length === 0) {
    fail("catalog function fallback returned no products");
  }
}

async function main() {
  validateRequiredFiles();
  validateJson();
  validateAssetReferences();
  validateBuildConfig();
  await validateFunctionFallback();

  warnings.forEach((message) => console.warn(`Warning: ${message}`));

  if (errors.length) {
    errors.forEach((message) => console.error(`Error: ${message}`));
    process.exit(1);
  }

  console.log("Project validation passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
