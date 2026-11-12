// The quick-links bar at the top of every page.
// - over the photo it's see-through; once you scroll past, it gets a background and shows your name
// - the link for the section you're reading is underlined
// - on phones the links fold into a "menu" button
// - "contact" opens a small card with your email and resume
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

  // the contact dropdown: email (copy / send) and resume
  const cbtn = nav.querySelector(".bar-cbtn"), card = nav.querySelector(".contact-card");
  if (cbtn) {
    const setCard = (open) => { card.classList.toggle("open", open); cbtn.setAttribute("aria-expanded", open); };
    cbtn.addEventListener("click", (e) => { e.stopPropagation(); setCard(!card.classList.contains("open")); });
    document.addEventListener("click", (e) => { if (!e.target.closest(".bar-contact") || e.target.closest(".contact-card a")) setCard(false); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") setCard(false); });
    card.querySelector("[data-copy]")?.addEventListener("click", async (e) => {
      const b = e.currentTarget;
      let ok = false;
      try { await navigator.clipboard.writeText(b.dataset.copy); ok = true; }
      catch {
        // older browsers, or ones that block the clipboard API: copy through a hidden text box
        const t = Object.assign(document.createElement("textarea"), { value: b.dataset.copy });
        t.style.cssText = "position:fixed;opacity:0";
        document.body.append(t); t.select();
        try { ok = document.execCommand("copy"); } catch {}
        t.remove();
      }
      b.textContent = ok ? "copied" : "couldn't copy";
      setTimeout(() => { b.textContent = "copy"; }, 1600);
    });
  }

  // keep the address bar clean: links to a section on this page scroll there without adding
  // "#about" etc. to the url, and arriving from another page at "/#about" tidies it back to "/"
  const smooth = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  const sectionFor = (hash) => (hash.length > 1 && !hash.startsWith("#note/") ? document.getElementById(decodeURIComponent(hash.slice(1))) : null);
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href*='#']");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href);
    if (url.pathname !== location.pathname) return;
    const el = sectionFor(url.hash);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: smooth });
  });
  const arrived = sectionFor(location.hash);
  if (arrived) {
    history.replaceState(null, "", location.pathname + location.search);
    // land on the section once the page has loaded, and keep it in place for a couple of
    // seconds while late content (the github grid) fills in above it, unless you start scrolling
    addEventListener("load", () => {
      const go = () => arrived.scrollIntoView({ behavior: "instant" });
      go();
      const ro = new ResizeObserver(go);
      ro.observe(document.body);
      const stop = () => { ro.disconnect(); removeEventListener("wheel", stop); removeEventListener("touchstart", stop); removeEventListener("keydown", stop); };
      addEventListener("wheel", stop, { passive: true }); addEventListener("touchstart", stop, { passive: true }); addEventListener("keydown", stop);
      setTimeout(stop, 2500);
    }, { once: true });
  }

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
}
