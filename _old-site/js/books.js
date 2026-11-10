// ✏️ The Shelf / notebook. Every entry is a markdown file in /notes, plus one line here.
//
//   kind     "book" (shows up as a spine on the shelf) or "note" (a loose idea, no book)
//   id       the file name: notes/<id>.md, and the link: yoursite/#note/<id>
//   status   books only: "reading" | "read" | "favourite"
//   tags     any of: "tech", "ai", "philosophy", "geopolitics" (or add your own)
//   threads  ids of other entries this one argues with or builds on. They're linked at the end.
//   date     "2026-11" style. Newest first is up to you; the list keeps this order.
//
// Book entries with an empty title render as dashed "open slot" spines and stay off the list.
// The essay itself lives in the .md file: paragraphs, ## headings, > quotes, **bold**, *italics*,
// [links](https://...) and - bullet lists all work. Copy notes/_template.md to start one.
export const ENTRIES = [
  {
    kind: "note", id: "why-this-exists", title: "Why this notebook exists",
    date: "2026-11", tags: ["philosophy", "tech"], threads: [],
    blurb: "A shelf is a list. I wanted somewhere the books could talk to each other.",
  },
  { kind: "book", id: "", title: "", author: "", status: "reading", date: "", tags: [], threads: [], blurb: "" },
  { kind: "book", id: "", title: "", author: "", status: "favourite", date: "", tags: [], threads: [], blurb: "" },
  { kind: "book", id: "", title: "", author: "", status: "read", date: "", tags: [], threads: [], blurb: "" },
  { kind: "book", id: "", title: "", author: "", status: "read", date: "", tags: [], threads: [], blurb: "" },
  { kind: "book", id: "", title: "", author: "", status: "read", date: "", tags: [], threads: [], blurb: "" },
  { kind: "book", id: "", title: "", author: "", status: "read", date: "", tags: [], threads: [], blurb: "" },
];
