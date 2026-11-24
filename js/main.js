// The home page: the hero photo and the github grid.
import { asciiHero } from "./hero.js?v=104";
import { bar } from "./bar.js?v=104";
import { githubGraph } from "./github.js?v=104";

const $ = (id) => document.getElementById(id);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// the shelf and notebook used to live on this page; send old links to where they are now
if (/^#(note\/|notebook|shelf-sec)/.test(location.hash)) {
  location.replace("/shelf" + (location.hash.startsWith("#note/") ? location.hash : location.hash === "#notebook" ? "#notebook" : ""));
}

// the home page doesn't scroll, so on a short window shrink the text to fit instead of cutting it off,
// and on a very large screen grow it so it isn't lost next to the photo
function fitIntro() {
  const intro = document.querySelector(".intro"), hero = document.querySelector(".hero");
  if (!intro || !hero) return;
  intro.style.scale = "";
  if (innerWidth <= 700) return;
  const cs = getComputedStyle(hero);
  const room = innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const h = intro.offsetHeight;
  // very wide screens (past 1600px) scale the text up with the photo, up to 2x, so it keeps a laptop's proportions
  const grow = innerWidth > 1600 ? Math.min(innerWidth / 1440, 2) : 1;
  const s = Math.min(grow, room / h);
  // shrinking: the block is taller than the room, so it sits at the top; growing: it's centred, so grow from the middle
  if (s !== 1) { intro.style.transformOrigin = s < 1 ? "left top" : "left center"; intro.style.scale = String(s); }
}

// ---------- boot ----------
bar();
fitIntro();
addEventListener("resize", fitIntro);
// refit when the text block changes size (fonts loading, the github grid filling in); scale doesn't change its size, so this can't loop
new ResizeObserver(fitIntro).observe(document.querySelector(".intro"));
githubGraph({ head: $("gh-head"), graph: $("gh-graph"), caption: $("gh-day") });

asciiHero($("photo"), { reduced }).catch((err) => console.warn("photo unavailable", err));
