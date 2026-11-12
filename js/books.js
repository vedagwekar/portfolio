// ✏️ The Shelf / notebook. Every entry is a markdown file in /notes, plus one line here.
//
//   kind     "book" (shows up as a spine on the shelf) or "note" (a loose idea, no book)
//   id       the file name: notes/<id>.md, and the link: yoursite/#note/<id>
//   status   books only: "reading" | "read" | "favourite"
//   type     "essay" or "braindump": which notebook tab it shows up under
//   threads  ids of other entries this one argues with or builds on. They're linked at the end.
//   date     "2026-11" style. Newest first is up to you; the list keeps this order.
//
// The home page shelf shows the first 9 books. the full shelf page (/shelf) shows them all; empty slots are drawn for you,
// and a new line here takes the next one.
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
  { kind: "book", type: "essay", id: "thus-spoke-zarathustra", title: "Thus Spoke Zarathustra", author: "Friedrich Nietzsche", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "count-of-monte-cristo", title: "The Count of Monte Cristo", author: "Alexandre Dumas", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "one-hundred-years-of-solitude", title: "One Hundred Years of Solitude", author: "Gabriel García Márquez", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "picture-of-dorian-gray", title: "The Picture of Dorian Gray", author: "Oscar Wilde", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "crime-and-punishment", title: "Crime and Punishment", author: "Fyodor Dostoevsky", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "red-rising", title: "Red Rising", author: "Pierce Brown", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "beyond-good-and-evil", title: "Beyond Good and Evil", author: "Friedrich Nietzsche", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "animal-farm", title: "Animal Farm", author: "George Orwell", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
  { kind: "book", type: "essay", id: "exhalation", title: "Exhalation", author: "Ted Chiang", status: "read", essay: false, date: "", threads: [], blurb: "no essay yet." },
];
