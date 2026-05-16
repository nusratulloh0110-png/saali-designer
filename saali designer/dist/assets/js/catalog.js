(function () {
  const NETLIFY_API_URL = "/.netlify/functions/catalog";
  const STATIC_DATA_URL = "assets/data/products.json?v=20260516-2";
  const TELEGRAM_ORDER_URL = "https://t.me/svmlnn";
  const PLACEHOLDER_IMAGE = "assets/images/placeholder.svg";

  const CATEGORY_LABELS = {
    all: { ru: "Все", uz: "Barchasi" },
    bags: { ru: "Сумки", uz: "Sumkalar" },
    jewelry: { ru: "Украшения", uz: "Bezaklar" },
    accessories: { ru: "Аксессуары", uz: "Aksessuarlar" },
    decor: { ru: "Декор", uz: "Dekor" },
    clothing: { ru: "Одежда", uz: "Kiyim" },
  };

  const DEMO_PRODUCTS = [
    {
      id: 1,
      name_ru: "Сумка с медальоном",
      name_uz: "Medalyonli sumka",
      category: "bags",
      price: 320000,
      old_price: 380000,
      description_ru: "Компактная сумка ручной работы с орнаментальным акцентом и плотной фактурой.",
      description_uz: "Naqshli aksent va mustahkam fakturaga ega qo'l mehnati ixcham sumka.",
      material: "Эко-кожа, текстиль, декоративная фурнитура",
      size: "22 x 18 см",
      image_url: PLACEHOLDER_IMAGE,
      in_stock: true,
      featured: true,
    },
    {
      id: 2,
      name_ru: "Серьги Пахта",
      name_uz: "Paxta ziraklari",
      category: "jewelry",
      price: 150000,
      old_price: "",
      description_ru: "Легкие серьги с мотивом хлопка и мягким золотым блеском.",
      description_uz: "Paxta motivi va mayin oltin jiloga ega yengil ziraklar.",
      material: "Латунь, эмаль",
      size: "4 см",
      image_url: PLACEHOLDER_IMAGE,
      in_stock: true,
      featured: true,
    },
    {
      id: 3,
      name_ru: "Брошь Гирих",
      name_uz: "Girih broshi",
      category: "accessories",
      price: 180000,
      old_price: "",
      description_ru: "Геометрическая брошь для жакета, платка или сумки.",
      description_uz: "Jaket, ro'mol yoki sumka uchun geometrik brosh.",
      material: "Дерево, эмаль, металл",
      size: "6 x 6 см",
      image_url: PLACEHOLDER_IMAGE,
      in_stock: true,
      featured: false,
    },
    {
      id: 4,
      name_ru: "Панно Арка",
      name_uz: "Arka pannosi",
      category: "decor",
      price: 420000,
      old_price: 470000,
      description_ru: "Декоративное панно с силуэтом восточной арки и орнаментальной рамкой.",
      description_uz: "Sharqona arka silueti va naqshli ramkaga ega dekorativ panno.",
      material: "Дерево, акрил",
      size: "35 x 45 см",
      image_url: PLACEHOLDER_IMAGE,
      in_stock: true,
      featured: true,
    },
    {
      id: 5,
      name_ru: "Пояс Терракота",
      name_uz: "Terrakota kamar",
      category: "clothing",
      price: 210000,
      old_price: "",
      description_ru: "Акцентный пояс с терракотовой гаммой и ручной отделкой.",
      description_uz: "Terrakota ranglari va qo'l ishlovi bilan aksent kamar.",
      material: "Текстиль, фурнитура",
      size: "Регулируемый",
      image_url: PLACEHOLDER_IMAGE,
      in_stock: false,
      featured: false,
    },
    {
      id: 6,
      name_ru: "Клатч Самарканд",
      name_uz: "Samarqand klatchi",
      category: "bags",
      price: 360000,
      old_price: "",
      description_ru: "Вечерний клатч с глубоким синим оттенком и золотой линией.",
      description_uz: "To'q ko'k tus va oltin chiziqli oqshom klatchi.",
      material: "Бархат, текстиль, металл",
      size: "24 x 14 см",
      image_url: PLACEHOLDER_IMAGE,
      in_stock: true,
      featured: true,
    },
    {
      id: 7,
      name_ru: "Колье Ислими",
      name_uz: "Islimiy marjoni",
      category: "jewelry",
      price: 260000,
      old_price: 300000,
      description_ru: "Колье с растительным мотивом и спокойной восточной пластикой.",
      description_uz: "O'simlik motivi va sokin sharqona shaklga ega marjon.",
      material: "Металл, эмаль, бусины",
      size: "45 см",
      image_url: PLACEHOLDER_IMAGE,
      in_stock: true,
      featured: false,
    },
    {
      id: 8,
      name_ru: "Декоративный чехол",
      name_uz: "Dekorativ g'ilof",
      category: "accessories",
      price: 120000,
      old_price: "",
      description_ru: "Мягкий чехол для небольших предметов с авторским орнаментом.",
      description_uz: "Kichik buyumlar uchun mualliflik naqshli yumshoq g'ilof.",
      material: "Текстиль",
      size: "16 x 12 см",
      image_url: PLACEHOLDER_IMAGE,
      in_stock: true,
      featured: false,
    },
  ];

  const state = {
    products: [],
    filtered: [],
    category: "all",
    query: "",
    sort: "default",
  };

  const selectors = {};

  const getLang = () => (window.Saali ? window.Saali.getLang() : localStorage.getItem("saali-lang") || "ru");

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const formatPrice = (value) => new Intl.NumberFormat("uz-UZ").format(Number(value) || 0);

  const parseNumber = (value) => {
    if (typeof value === "number") return value;
    const normalized = String(value ?? "").replace(/[^\d.-]/g, "");
    return Number(normalized) || 0;
  };

  const isTruthy = (value) => {
    if (typeof value === "boolean") return value;
    return ["true", "1", "yes", "да", "ha"].includes(String(value ?? "").trim().toLowerCase());
  };

  const convertDriveImage = (url) => {
    const value = String(url || "").trim();
    if (!value) return PLACEHOLDER_IMAGE;

    const fileMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (fileMatch) {
      return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w600`;
    }

    const idMatch = value.match(/[?&]id=([^&]+)/);
    if (value.includes("drive.google.com") && idMatch) {
      return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w600`;
    }

    return value;
  };

  const normalizeProduct = (raw) => ({
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
  });

  const fetchProducts = async () => {
    const serverProducts = await fetchNetlifyProducts();
    if (serverProducts.length) return serverProducts;

    const staticProducts = await fetchStaticProducts();
    if (staticProducts.length) return staticProducts;

    await new Promise((resolve) => window.setTimeout(resolve, 520));
    return DEMO_PRODUCTS.map(normalizeProduct);
  };

  const fetchNetlifyProducts = async () => {
    try {
      const response = await fetch(NETLIFY_API_URL, { headers: { accept: "application/json" } });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.products) ? data.products.map(normalizeProduct) : [];
    } catch (error) {
      return [];
    }
  };

  const fetchStaticProducts = async () => {
    try {
      const response = await fetch(STATIC_DATA_URL, { headers: { accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data.map(normalizeProduct) : [];
    } catch (error) {
      return [];
    }
  };

  const categoryLabel = (category, lang = getLang()) => {
    const label = CATEGORY_LABELS[category] || CATEGORY_LABELS.accessories;
    return label[lang] || label.ru;
  };

  const productName = (product, lang = getLang()) => (lang === "uz" ? product.name_uz : product.name_ru);
  const productDescription = (product, lang = getLang()) => (lang === "uz" ? product.description_uz : product.description_ru);

  const orderUrl = (product) => {
    const message = encodeURIComponent(`Здравствуйте! Хочу заказать: ${product.name_ru} (ID: ${product.id})`);
    return `${TELEGRAM_ORDER_URL}?text=${message}`;
  };

  const telegramIcon = () => `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M27.6 5.2 3.9 14.3c-1.6.6-1.6 1.5-.3 1.9l6.1 1.9 2.3 7.1c.3.9.2 1.2 1.1 1.2.7 0 1-.3 1.4-.7l3.3-3.2 6.8 5c1.3.7 2.2.3 2.5-1.2l4.5-21.1c.5-1.9-.7-2.7-2-2Z" />
      <path d="M10.6 17.7 24.8 8.8c.7-.4 1.3-.2.8.3L14.1 19.5l-.5 5.2-3-7Z" />
    </svg>
  `;

  const renderProductCard = (product) => {
    const lang = getLang();
    const name = escapeHtml(productName(product, lang));
    const desc = escapeHtml(productDescription(product, lang));
    const inStockText = lang === "uz" ? "Mavjud emas" : "Нет в наличии";
    const orderText = lang === "uz" ? "Telegramda buyurtma berish" : "Заказать в Telegram";
    const oldPrice = product.old_price
      ? `<span class="product-card__old-price">${formatPrice(product.old_price)} сум</span>`
      : "";

    return `
      <article class="product-card" data-product-id="${escapeHtml(product.id)}" tabindex="0" role="button" aria-label="${name}">
        <div class="product-card__image-wrap">
          <img class="product-card__image" src="${escapeHtml(product.image_url)}" alt="${name}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMAGE}'" />
          <span class="product-card__badge">${escapeHtml(categoryLabel(product.category, lang))}</span>
        </div>
        <div class="product-card__body">
          <h3 class="product-card__title">${name}</h3>
          <p class="product-card__desc">${desc}</p>
          <div class="product-card__price-row">
            <span class="product-card__price">${formatPrice(product.price)} сум</span>
            ${oldPrice}
          </div>
          ${product.in_stock ? "" : `<span class="product-card__sold-out">${inStockText}</span>`}
          <a class="btn btn--primary btn--full product-card__order ${product.in_stock ? "" : "btn--disabled"}"
             href="${orderUrl(product)}"
             target="_blank"
             rel="noopener noreferrer"
             ${product.in_stock ? "" : 'aria-disabled="true"'}
             data-order-link>
            ${telegramIcon()}
            <span>${orderText}</span>
          </a>
        </div>
      </article>
    `;
  };

  const sortProducts = (products) => {
    const nextProducts = [...products];
    if (state.sort === "price-asc") nextProducts.sort((a, b) => a.price - b.price);
    if (state.sort === "price-desc") nextProducts.sort((a, b) => b.price - a.price);
    return nextProducts;
  };

  const getFilteredProducts = () => {
    const query = state.query.trim().toLowerCase();
    const filtered = state.products.filter((product) => {
      const matchesCategory = state.category === "all" || product.category === state.category;
      const haystack = `${product.name_ru} ${product.name_uz} ${product.description_ru} ${product.description_uz}`.toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });

    return sortProducts(filtered);
  };

  const updateCounts = () => {
    document.querySelectorAll("[data-filter]").forEach((button) => {
      const category = button.dataset.filter;
      const count = category === "all" ? state.products.length : state.products.filter((product) => product.category === category).length;
      const label = button.querySelector("[data-count-label]");
      if (label) label.textContent = String(count);
    });
  };

  const bindProductCards = () => {
    selectors.grid.querySelectorAll("[data-product-id]").forEach((card) => {
      const product = state.products.find((item) => String(item.id) === String(card.dataset.productId));
      if (!product) return;

      card.addEventListener("click", (event) => {
        if (event.target.closest("[data-order-link]")) return;
        openModal(product);
      });

      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openModal(product);
        }
      });
    });
  };

  const render = () => {
    if (!state.products.length && selectors.skeleton && !selectors.skeleton.hidden) return;

    state.filtered = getFilteredProducts();
    updateCounts();

    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.filter === state.category);
    });

    selectors.grid.innerHTML = state.filtered.map(renderProductCard).join("");
    selectors.empty.hidden = state.filtered.length > 0;
    selectors.grid.hidden = state.filtered.length === 0;
    selectors.listSection.setAttribute("aria-busy", "false");
    bindProductCards();
  };

  const showSkeleton = () => {
    selectors.error.hidden = true;
    selectors.empty.hidden = true;
    selectors.grid.hidden = true;
    selectors.skeleton.hidden = false;
    selectors.listSection.setAttribute("aria-busy", "true");
  };

  const hideSkeleton = () => {
    selectors.skeleton.hidden = true;
  };

  const showError = () => {
    hideSkeleton();
    selectors.grid.hidden = true;
    selectors.empty.hidden = true;
    selectors.error.hidden = false;
    selectors.listSection.setAttribute("aria-busy", "false");
  };

  async function loadCatalog() {
    showSkeleton();
    try {
      state.products = await fetchProducts();
      hideSkeleton();
      render();
    } catch (error) {
      console.error(error);
      showError();
    }
  }

  function openModal(product) {
    const lang = getLang();
    const name = escapeHtml(productName(product, lang));
    const desc = escapeHtml(productDescription(product, lang));
    const category = escapeHtml(categoryLabel(product.category, lang));
    const labels =
      lang === "uz"
        ? { material: "Material", size: "O'lcham", handmade: "Qo'l mehnati", order: "Telegramda buyurtma berish", price: "Narx" }
        : { material: "Материал", size: "Размер", handmade: "Ручная работа", order: "Заказать в Telegram", price: "Цена" };
    const oldPrice = product.old_price ? `<del>${formatPrice(product.old_price)} сум</del>` : "";

    selectors.modalContent.innerHTML = `
      <img class="product-modal__image" src="${escapeHtml(product.image_url)}" alt="${name}" onerror="this.src='${PLACEHOLDER_IMAGE}'" />
      <div class="product-modal__info">
        <p class="section-kicker">${category}</p>
        <h2 id="modalTitle">${name}</h2>
        <p>${desc}</p>
        <div class="product-modal__price">
          <span>${labels.price}:</span>
          <strong>${formatPrice(product.price)} сум</strong>
          ${oldPrice}
        </div>
        <div class="product-modal__meta">
          <span><b>${labels.material}</b><em>${escapeHtml(product.material)}</em></span>
          <span><b>${labels.size}</b><em>${escapeHtml(product.size)}</em></span>
          <span><b>${labels.handmade}</b><em>✓</em></span>
        </div>
        <a class="btn btn--primary btn--full ${product.in_stock ? "" : "btn--disabled"}" href="${orderUrl(product)}" target="_blank" rel="noopener noreferrer" ${product.in_stock ? "" : 'aria-disabled="true"'}>
          ${telegramIcon()}
          <span>${labels.order}</span>
        </a>
      </div>
    `;

    selectors.modal.hidden = false;
    document.body.style.overflow = "hidden";
    selectors.modal.querySelector(".product-modal__close").focus();
  }

  function closeModal() {
    selectors.modal.hidden = true;
    selectors.modalContent.innerHTML = "";
    document.body.style.overflow = "";
  }

  const resetFilters = () => {
    state.query = "";
    state.category = "all";
    state.sort = "default";
    selectors.search.value = "";
    updateSortUI();
    render();
  };

  const closeSortMenu = () => {
    if (!selectors.sortMenu) return;
    selectors.sortMenu.hidden = true;
    selectors.sortWrapper.classList.remove("is-open");
    selectors.sortTrigger.setAttribute("aria-expanded", "false");
  };

  const toggleSortMenu = () => {
    const isOpen = selectors.sortMenu.hidden;
    selectors.sortMenu.hidden = !isOpen;
    selectors.sortWrapper.classList.toggle("is-open", isOpen);
    selectors.sortTrigger.setAttribute("aria-expanded", String(isOpen));
  };

  const updateSortUI = () => {
    if (!selectors.sortOptions || !selectors.sortCurrent) return;

    selectors.sortOptions.forEach((option) => {
      const selected = option.dataset.value === state.sort;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-selected", String(selected));
      if (selected) selectors.sortCurrent.textContent = option.textContent;
    });
  };

  const cacheSelectors = () => {
    selectors.search = document.querySelector("[data-catalog-search]");
    selectors.sortWrapper = document.querySelector("[data-custom-sort]");
    selectors.sortTrigger = document.querySelector("[data-sort-trigger]");
    selectors.sortCurrent = document.querySelector("[data-sort-current]");
    selectors.sortMenu = document.querySelector("[data-sort-menu]");
    selectors.sortOptions = document.querySelectorAll("[data-sort-option]");
    selectors.grid = document.querySelector("[data-product-grid]");
    selectors.skeleton = document.querySelector("[data-skeleton-grid]");
    selectors.empty = document.querySelector("[data-empty-state]");
    selectors.error = document.querySelector("[data-catalog-error]");
    selectors.listSection = document.querySelector(".catalog-list");
    selectors.modal = document.querySelector("[data-product-modal]");
    selectors.modalContent = document.querySelector("[data-modal-content]");
  };

  const bindControls = () => {
    selectors.search.addEventListener("input", (event) => {
      state.query = event.target.value;
      render();
    });

    selectors.sortTrigger.addEventListener("click", toggleSortMenu);

    selectors.sortOptions.forEach((option) => {
      option.addEventListener("click", () => {
        state.sort = option.dataset.value;
        updateSortUI();
        closeSortMenu();
        render();
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-custom-sort]")) closeSortMenu();
    });

    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.category = button.dataset.filter;
        render();
      });
    });

    document.querySelector("[data-reset-filters]").addEventListener("click", resetFilters);
    document.querySelector("[data-retry-catalog]").addEventListener("click", loadCatalog);

    selectors.modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-modal-close]")) closeModal();
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSortMenu();
      if (event.key === "Escape" && !selectors.modal.hidden) closeModal();
    });

    window.addEventListener("saali:langchange", () => {
      updateSortUI();
      render();
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    cacheSelectors();
    bindControls();
    loadCatalog();
  });
})();
