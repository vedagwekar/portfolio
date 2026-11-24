// ✏️ Your work and projects, in one place.
// WORK is the "what i'm working on" list on the about page (about.html).
// PROJECTS is the list on projects.html and the "what i've built" list on the about page, in the order shown.

export const WORK = [
  { name: "waterloo aerial robotics", what: "embedded flight software", when: "nov 2026 →", url: "https://www.uwarg.com", more: "writing sensor drivers in c/c++ for our drone autopilot." },
  { name: "sustainable physical ai society", what: "perception and vision", when: "sep 2026 →", url: "https://spais.win", more: "computer vision for a strawberry-farm robot, telling crops from weeds. also looking at thermal sensing to catch frost early." },
  { name: "youth policy council", what: "full stack developer", when: "sep 2025 →", url: "https://youthpolicycouncil.ca", more: "i built the site and maintain it on my own. next.js, supabase and 190+ tests." },
];

// video: a YouTube video id (the part after "watch?v="). Projects with one show the video on /projects;
// put them first. links: extra buttons under the description, besides the github link in url.
export const PROJECTS = [
  { name: "squint", tags: ["hack western 13", "sun life track runner-up", "nov 2026"], video: "T-LUZIXTAD8", url: "https://github.com/dinud2/Squint",
    links: [{ label: "devpost", url: "https://devpost.com/software/squint-etuyvg" }, { label: "try the family app", url: "https://appetize.io/app/b_yzatlsilxxj7evpjwh3tvedppy" }],
    more: "a small face on the kitchen counter that knows who picked up which pill bottle, stops a second dose of a prescription medication before it happens, and tells the family. every model runs on a raspberry pi 5 under qnx, and nothing goes to the cloud." },
  { name: "homeward", tags: ["stellar blockchain innovation challenge", "nov 2026"], video: "AOz72MBwKmw", url: "https://github.com/vedagwekar/homeward",
    links: [{ label: "devpost", url: "https://devpost.com/software/homeward-jbf4wh" }, { label: "guided demo", url: "https://homeward-ecru.vercel.app/demo" }],
    more: "families abroad pay for their parents' house through a smart contract on stellar, one stage at a time. each stage is paid only after an independent engineer checks the work and the parent says yes. i was the technical lead, built the backend, and presented it." },
  { name: "lightning response", tags: ["hackathon winner", "sep 2026"], url: "https://github.com/shan-d-louis/formulatechhacks",
    links: [{ label: "devpost", url: "https://devpost.com/software/sidewall-8x2agh" }],
    more: "an ai pit wall for f1 tyres, trained on 138,683 laps. run against hamilton's silverstone 2020 failure, it gave a warning 15 laps early." },
  { name: "cetr index", tags: ["open source", "python"], url: "https://github.com/vedagwekar/cetr-index", more: "ranks which canadian provinces are most exposed to the move off fossil fuels, and tests whether the ranking holds up under different methods." },
];
