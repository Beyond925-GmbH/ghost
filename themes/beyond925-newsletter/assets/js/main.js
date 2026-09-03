(() => {
    const button = document.querySelector(".menu-toggle");
    const navigation = document.querySelector(".site-navigation");

    if (button && navigation) {
        button.addEventListener("click", () => {
            const expanded = button.getAttribute("aria-expanded") === "true";
            button.setAttribute("aria-expanded", String(!expanded));
            navigation.classList.toggle("is-open", !expanded);
        });
    }

    const reveals = document.querySelectorAll(".reveal");
    if (!reveals.length) {
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
        reveals.forEach((el) => {
            el.classList.add("is-visible");
        });
        return;
    }

    document.documentElement.classList.add("js-reveal");

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    reveals.forEach((el) => {
        observer.observe(el);
    });
})();
