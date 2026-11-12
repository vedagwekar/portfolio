// ✏️ Your work and projects, in one place.
// WORK opens as popups from the linked phrases in the about section on the home page
// (the data-work="…" number in index.html picks which one).
// PROJECTS is the list on projects.html, in the order shown.

export const WORK = [
  { name: "waterloo aerial robotics", what: "embedded flight software", when: "nov 2026 →", more: "writing sensor drivers in c/c++ for our drone autopilot." },
  { name: "sustainable physical ai society", what: "perception and vision", when: "sep 2026 →", more: "computer vision for a strawberry-farm robot, telling crops from weeds. also looking at thermal sensing to catch frost early." },
  { name: "youth policy council", what: "full stack developer", when: "sep 2025 →", url: "https://youthpolicycouncil.ca", more: "i built the site and maintain it on my own. next.js, supabase and 190+ tests." },
];

export const PROJECTS = [
  { name: "lightning response", tags: ["hackathon winner", "sep 2026"], url: "https://github.com/shan-d-louis/formulatechhacks", more: "an ai pit wall for f1 tyres, trained on 138,683 laps. run against hamilton's silverstone 2020 failure, it gave a warning 15 laps early." },
  { name: "cetr index", tags: ["open source", "python"], url: "https://github.com/vedagwekar/cetr-index", more: "ranks which canadian provinces are most exposed to the move off fossil fuels, and tests whether the ranking holds up under different methods." },
  { name: "home ml server", tags: ["homelab", "2026 →"], more: "an old gaming laptop wiped and running headless debian. the goal is to have it training models around the clock." },
];
