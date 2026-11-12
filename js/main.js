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

// ---------- boot ----------
bar();
githubGraph({ head: $("gh-head"), graph: $("gh-graph"), caption: $("gh-day") });

asciiHero($("photo"), { reduced }).catch((err) => console.warn("photo unavailable", err));
