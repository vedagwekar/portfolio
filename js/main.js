// The home page: the hero photo and the github grid.
import { asciiHero } from "./hero.js?v=85";
import { bar } from "./bar.js?v=85";
import { githubGraph } from "./github.js?v=85";

const $ = (id) => document.getElementById(id);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// the shelf and notebook used to live on this page; send old links to where they are now
if (/^#(note\/|notebook|shelf-sec)/.test(location.hash)) {
  location.replace("/shelf" + (location.hash.startsWith("#note/") ? location.hash : location.hash === "#notebook" ? "#notebook" : ""));
}

// the home page doesn't scroll, so on a short window shrink the text to fit instead of cutting it off
function fitIntro() {
  const intro = document.querySelector(".intro"), hero = document.querySelector(".hero");
  if (!intro || !hero) return;
  intro.style.scale = "";
  if (innerWidth <= 700) return;
  const cs = getComputedStyle(hero);
  const room = innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const h = intro.offsetHeight;
  if (h > room) { intro.style.transformOrigin = "left top"; intro.style.scale = String(room / h); }
}

// ---------- boot ----------
bar();
fitIntro();
addEventListener("resize", fitIntro);
// refit when the text block changes size (fonts loading, the github grid filling in); scale doesn't change its size, so this can't loop
new ResizeObserver(fitIntro).observe(document.querySelector(".intro"));
githubGraph({ head: $("gh-head"), graph: $("gh-graph"), caption: $("gh-day") });

asciiHero($("photo"), { reduced }).catch((err) => console.warn("photo unavailable", err));
