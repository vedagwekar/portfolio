// ✏️ The Shelf / notebook. Every entry is a markdown file in /notes, plus one line here.
//
//   kind     "book" (shows up as a spine on the shelf) or "note" (a loose idea, no book)
//   id       the file name: notes/<id>.md, and the link: yoursite/shelf#note/<id>
//   status   books only: "reading" | "read" | "favourite"
//   type     "essay" or "braindump": which notebook tab it shows up under
//   threads  ids of other entries this one argues with or builds on. They're linked at the end.
//   date     "2026-11" style. Newest first is up to you; the list keeps this order.
//
// Everything lives on /shelf: the books as spines (a new shelf appears once the last one is full), and the notebook
// list under them. Empty slots are drawn for you, and a new line here takes the next one.
// A book you've read but haven't written up yet has essay: false. It sits on the shelf and stays off
// the notebook list. To publish: write notes/<id>.md, delete essay: false, fill in the date and blurb.
//
// The essay itself lives in the .md file: paragraphs, ## headings, > quotes, **bold**, *italics*,
// [links](https://...) and - bullet lists all work. Copy notes/_template.md to start one.
export const ENTRIES = [
  {
    kind: "note", type: "braindump", id: "why-this-exists", title: "why this exists",
    date: "2026-11", threads: [],
    blurb: "why i started this notebook.",
  },
  { kind: "book", type: "essay", id: "thus-spoke-zarathustra", title: "thus spoke zarathustra", author: "friedrich nietzsche", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "count-of-monte-cristo", title: "the count of monte cristo", author: "alexandre dumas", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "one-hundred-years-of-solitude", title: "one hundred years of solitude", author: "gabriel garcía márquez", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "picture-of-dorian-gray", title: "the picture of dorian gray", author: "oscar wilde", status: "read", date: "2026-05", threads: [], blurb: "highlight reels, game film, and the portrait we keep upstairs." },
  { kind: "book", type: "essay", id: "crime-and-punishment", title: "crime and punishment", author: "fyodor dostoevsky", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "red-rising", title: "red rising", author: "pierce brown", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "beyond-good-and-evil", title: "beyond good and evil", author: "friedrich nietzsche", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "animal-farm", title: "animal farm", author: "george orwell", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "exhalation", title: "exhalation", author: "ted chiang", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
];
