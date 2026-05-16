(function () {
  const animateNumber = (element) => {
    const target = Number(element.dataset.count || 0);
    const duration = 1250;
    const start = performance.now();

    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  };

  const initCounters = () => {
    const counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;

    if (!("IntersectionObserver" in window)) {
      counters.forEach(animateNumber);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateNumber(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );

    counters.forEach((counter) => observer.observe(counter));
  };

  const initTestimonials = () => {
    const slider = document.querySelector("[data-testimonial-slider]");
    if (!slider) return;

    const slides = Array.from(slider.querySelectorAll("[data-slide]"));
    const prev = slider.querySelector("[data-slider-prev]");
    const next = slider.querySelector("[data-slider-next]");
    const dotsWrap = slider.querySelector("[data-slider-dots]");
    let active = 0;
    let autoplayId = null;

    const dots = slides.map((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Отзыв ${index + 1}`);
      dot.addEventListener("click", () => show(index));
      dotsWrap.appendChild(dot);
      return dot;
    });

    function show(index) {
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === active));
      dots.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === active));
    }

    function startAutoplay() {
      window.clearInterval(autoplayId);
      autoplayId = window.setInterval(() => show(active + 1), 6200);
    }

    prev.addEventListener("click", () => {
      show(active - 1);
      startAutoplay();
    });

    next.addEventListener("click", () => {
      show(active + 1);
      startAutoplay();
    });

    slider.addEventListener("mouseenter", () => window.clearInterval(autoplayId));
    slider.addEventListener("mouseleave", startAutoplay);

    show(0);
    startAutoplay();
  };

  document.addEventListener("DOMContentLoaded", () => {
    initCounters();
    initTestimonials();
  });
})();
