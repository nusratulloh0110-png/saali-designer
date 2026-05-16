(function () {
  const STORAGE_KEY = "saali-lang";
  const LANGS = ["ru", "uz"];

  const getStoredLang = () => {
    const value = localStorage.getItem(STORAGE_KEY);
    return LANGS.includes(value) ? value : "ru";
  };

  const setText = (element, lang) => {
    const text = element.dataset[`lang${lang[0].toUpperCase()}${lang.slice(1)}`];
    if (typeof text === "string") {
      element.textContent = text;
    }
  };

  const setPlaceholder = (element, lang) => {
    const value = element.dataset[`langPlaceholder${lang[0].toUpperCase()}${lang.slice(1)}`];
    if (typeof value === "string") {
      element.setAttribute("placeholder", value);
    }
  };

  const applyLanguage = (lang) => {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-lang-ru], [data-lang-uz]").forEach((element) => setText(element, lang));
    document.querySelectorAll("[data-lang-placeholder-ru], [data-lang-placeholder-uz]").forEach((element) => setPlaceholder(element, lang));
    document.querySelectorAll("[data-lang-switch]").forEach((button) => {
      const active = button.dataset.langSwitch === lang;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    window.dispatchEvent(new CustomEvent("saali:langchange", { detail: { lang } }));
  };

  const setLanguage = (lang) => {
    const nextLang = LANGS.includes(lang) ? lang : "ru";
    localStorage.setItem(STORAGE_KEY, nextLang);
    applyLanguage(nextLang);
  };

  const initLanguage = () => {
    document.querySelectorAll("[data-lang-switch]").forEach((button) => {
      button.addEventListener("click", () => setLanguage(button.dataset.langSwitch));
    });
    applyLanguage(getStoredLang());
  };

  const initPreloader = () => {
    const preloader = document.querySelector(".preloader");
    if (!preloader) return;

    window.setTimeout(() => {
      preloader.classList.add("is-hidden");
      window.setTimeout(() => preloader.remove(), 520);
    }, 800);
  };

  const initHeader = () => {
    const header = document.querySelector("[data-header]");
    if (!header) return;

    const updateHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 80);
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  };

  const initMenu = () => {
    const toggle = document.querySelector("[data-menu-toggle]");
    const links = document.querySelectorAll("[data-menu-link]");
    if (!toggle) return;

    const closeMenu = () => {
      document.body.classList.remove("is-menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Открыть меню");
    };

    toggle.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("is-menu-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
    });

    links.forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  };

  const initReveal = () => {
    const elements = document.querySelectorAll(".reveal");
    if (!elements.length) return;

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    elements.forEach((element) => observer.observe(element));
  };

  const initRipples = () => {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(".btn");
      if (!button || button.classList.contains("btn--disabled")) return;

      const rect = button.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "btn__ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      button.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 700);
    });
  };

  const initCursor = () => {
    const prefersFinePointer = window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches;
    if (!prefersFinePointer) return;

    const cursor = document.createElement("span");
    cursor.className = "ethno-cursor";
    document.body.appendChild(cursor);

    window.addEventListener(
      "mousemove",
      (event) => {
        cursor.style.opacity = "1";
        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;
      },
      { passive: true }
    );

    window.addEventListener("mouseleave", () => {
      cursor.style.opacity = "0";
    });
  };

  const initScrollIndicator = () => {
    const indicator = document.querySelector("[data-scroll-indicator]");
    if (!indicator) return;

    const update = () => indicator.classList.toggle("is-hidden", window.scrollY > 40);
    update();
    window.addEventListener("scroll", update, { passive: true });
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.Saali = {
      getLang: getStoredLang,
      setLang: setLanguage,
      refreshLang: () => applyLanguage(getStoredLang()),
    };

    initLanguage();
    initPreloader();
    initHeader();
    initMenu();
    initReveal();
    initRipples();
    initCursor();
    initScrollIndicator();
  });
})();
