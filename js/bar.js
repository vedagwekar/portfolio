// The quick-links bar at the top of every page.
// - over the photo it's see-through; once you scroll past, it gets a background and shows your name
// - the link for the section you're reading is underlined
// - on phones the links fold into a "menu" button
export function bar() {
  const nav = document.getElementById("bar");
  if (!nav) return;
  const btn = nav.querySelector(".bar-menu");
  const setOpen = (open) => {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open);
    btn.textContent = open ? "close" : "menu";
  };
  btn.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav.addEventListener("click", (e) => { if (e.target.closest(".bar-links a")) setOpen(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

  // solid as soon as you scroll, so it never sits on top of the photo's text;
  // your name shows in it once the big name on the photo is gone
  const stage = document.querySelector(".stage");
  if (stage) {
    const onScroll = () => nav.classList.toggle("solid", scrollY > 4);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const h1 = stage.querySelector("h1");
    new IntersectionObserver(([e]) => nav.classList.toggle("past", !e.isIntersecting), { rootMargin: "-52px 0px 0px 0px" }).observe(h1);
  } else nav.classList.add("past");

  // underline the section currently in the middle of the screen
  const links = [...nav.querySelectorAll('.bar-links a[href^="#"]')];
  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const sections = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  if (!sections.length) return;
  const io = new IntersectionObserver((list) => {
    for (const e of list) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.removeAttribute("aria-current"));
      byId.get(e.target.id)?.setAttribute("aria-current", "true");
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => io.observe(s));
  // nothing underlined while you're on the photo
  if (stage) new IntersectionObserver(([e]) => { if (e.isIntersecting) links.forEach((a) => a.removeAttribute("aria-current")); }, { rootMargin: "-45% 0px -50% 0px" }).observe(stage);
}
