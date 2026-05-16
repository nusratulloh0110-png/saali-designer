const { readProducts } = require("./catalog-store");

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30, stale-while-revalidate=120",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async () => {
  const { products, source } = await readProducts();
  return response(200, { products, source });
};

