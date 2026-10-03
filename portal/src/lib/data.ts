export type Status = "On track" | "Needs you" | "Complete" | "Starting";

export type TabId = "items" | "roster" | "proofs" | "files";

export type RosterRow = {
  num: string;
  name: string;
  pos: string;
  jersey: string;
  short: string;
  back: string;
  submitted: boolean;
};

export type KitItem = {
  name: string;
  qty: string;
  proof: string;
  status: string;
};

export type Program = {
  slug: string;
  name: string;
  line: string;
  meta: string;
  stage: string;
  status: Status;
  filled: number;
  total: number;
  eyebrow: string;
  title: string;
  deliveryLabel: string;
  deliveryDate: string;
  phase: string;
  weekNote: string;
  weekAuthor: string;
  shipTo: string;
  shipNote: string;
  items: KitItem[];
  roster: RosterRow[];
  milestones: {label: string; date: string; state: "done" | "now" | "next"}[];
  proofs: {version: string; date: string; note: string; current?: boolean}[];
  files: {name: string; meta: string}[];
};

const womensRoster: RosterRow[] = [
  {num: "2", name: "A. Kim", pos: "DEF", jersey: "M", short: "S", back: "KIM", submitted: true},
  {num: "4", name: "[Athlete]", pos: "MID", jersey: "—", short: "—", back: "—", submitted: false},
  {num: "7", name: "M. Ortiz", pos: "FWD", jersey: "S", short: "S", back: "ORTIZ", submitted: true},
  {num: "9", name: "[Athlete]", pos: "FWD", jersey: "—", short: "—", back: "—", submitted: false},
  {num: "10", name: "J. Reyes", pos: "MID", jersey: "L", short: "M", back: "REYES", submitted: true},
  {num: "14", name: "[Athlete]", pos: "DEF", jersey: "—", short: "—", back: "—", submitted: false},
  {num: "18", name: "T. Nguyen", pos: "MID", jersey: "M", short: "M", back: "NGUYEN", submitted: true},
  {num: "21", name: "[Athlete]", pos: "GK", jersey: "—", short: "—", back: "—", submitted: false},
  {num: "23", name: "S. Park", pos: "DEF", jersey: "L", short: "L", back: "PARK", submitted: true},
];

export const programs: Program[] = [
  {
    slug: "cross-country",
    name: "Cross Country",
    line: "Travel kits · 114 athletes",
    meta: "Production · wk 5 of 6",
    stage: "Production · wk 5 of 6",
    status: "On track",
    filled: 4,
    total: 6,
    eyebrow: "SLCC · Cross Country",
    title: "TRAVEL KITS 2026",
    deliveryLabel: "Delivers to SLCC Athletics",
    deliveryDate: "OCT 17",
    phase: "IN PRODUCTION",
    weekNote:
      "Printing wrapped Tuesday. Sewing is 60% done. QC starts the 13th — still on track for the 17th.",
    weekAuthor: "Mark · Volta ops · Mon",
    shipTo: "SLCC Athletics",
    shipNote: "Packed by athlete · tracking posts at ship",
    items: [
      {name: "Training shirt ×3", qty: "342", proof: "v2", status: "Sewing"},
      {name: "Pullover hoodie", qty: "114", proof: "v1", status: "Sewing"},
      {name: "Quarter zip + jogger", qty: "114", proof: "v2", status: "Printing"},
      {name: "Coaches kit", qty: "[n]", proof: "v1", status: "Sewing"},
    ],
    roster: [
      {num: "1", name: "A. Cole", pos: "—", jersey: "M", short: "M", back: "COLE", submitted: true},
      {num: "2", name: "R. Diaz", pos: "—", jersey: "S", short: "S", back: "DIAZ", submitted: true},
      {num: "3", name: "L. Berg", pos: "—", jersey: "L", short: "M", back: "BERG", submitted: true},
      {num: "8", name: "[Athlete]", pos: "—", jersey: "—", short: "—", back: "—", submitted: false},
    ],
    milestones: [
      {label: "Kickoff", date: "Aug 28", state: "done"},
      {label: "Design", date: "Sep 4", state: "done"},
      {label: "Samples", date: "Sep 15", state: "done"},
      {label: "Production", date: "Now", state: "now"},
      {label: "QC", date: "~Oct 13", state: "next"},
      {label: "Delivered", date: "~Oct 17", state: "next"},
    ],
    proofs: [
      {version: "v2", date: "Sep 18", note: "Sleeve lockup approved", current: true},
      {version: "v1", date: "Sep 6", note: "First mockups"},
    ],
    files: [
      {name: "Travel-kit-spec.pdf", meta: "Uploaded Sep 4"},
      {name: "Roster-export.csv", meta: "114 athletes"},
      {name: "Invoice-draft.pdf", meta: "Ready for PO"},
    ],
  },
  {
    slug: "womens-soccer",
    name: "Women’s Soccer",
    line: "Fall 2026 kits · 28 athletes",
    meta: "Design · proof v3 ready",
    stage: "Design · proof v3 ready",
    status: "Needs you",
    filled: 2,
    total: 6,
    eyebrow: "SLCC · Women’s Soccer",
    title: "AWAY KITS 2026",
    deliveryLabel: "Delivers to SLCC Athletics",
    deliveryDate: "OCT 24",
    phase: "WAITING ON YOU",
    weekNote:
      "v3 is up with the sleeve stripe moved 1 inch. Marli’s note is in the proof. Factory holds until you sign.",
    weekAuthor: "Melanie · Volta · Sep 29",
    shipTo: "SLCC Athletics",
    shipNote: "Sizes still missing for 4 athletes",
    items: [
      {name: "Away jersey", qty: "28", proof: "v3", status: "Needs approval"},
      {name: "Away short", qty: "28", proof: "v2", status: "Waiting"},
      {name: "Warmup top", qty: "28", proof: "v1", status: "Design"},
    ],
    roster: womensRoster,
    milestones: [
      {label: "Kickoff", date: "Sep 2", state: "done"},
      {label: "Design", date: "Now", state: "now"},
      {label: "Samples", date: "—", state: "next"},
      {label: "Production", date: "—", state: "next"},
      {label: "QC", date: "—", state: "next"},
      {label: "Delivered", date: "~Oct 24", state: "next"},
    ],
    proofs: [
      {version: "v3", date: "Today", note: "Sleeve stripe + block numbers", current: true},
      {version: "v2", date: "Sep 29", note: "Sleeve sitting low"},
      {version: "v1", date: "Sep 22", note: "First mockup"},
    ],
    files: [
      {name: "Away-kit-v3.pdf", meta: "Today"},
      {name: "Palette.ase", meta: "SLCC colors"},
    ],
  },
  {
    slug: "mens-soccer",
    name: "Men’s Soccer",
    line: "3 kits + apparel · 38 athletes",
    meta: "Delivered",
    stage: "Delivered",
    status: "Complete",
    filled: 6,
    total: 6,
    eyebrow: "SLCC · Men’s Soccer",
    title: "FALL KITS",
    deliveryLabel: "Delivered to SLCC Athletics",
    deliveryDate: "SEP 20",
    phase: "DELIVERED",
    weekNote: "All three kits received. No open proof or size tasks.",
    weekAuthor: "Mark · Volta ops · Sep 20",
    shipTo: "SLCC Athletics",
    shipNote: "Delivered Sep 20",
    items: [
      {name: "Home kit", qty: "38", proof: "v2", status: "Delivered"},
      {name: "Away kit", qty: "38", proof: "v2", status: "Delivered"},
      {name: "Training top", qty: "38", proof: "v1", status: "Delivered"},
    ],
    roster: [
      {num: "9", name: "C. Alvarez", pos: "FWD", jersey: "M", short: "M", back: "ALVAREZ", submitted: true},
      {num: "10", name: "D. Shah", pos: "MID", jersey: "L", short: "L", back: "SHAH", submitted: true},
    ],
    milestones: [
      {label: "Kickoff", date: "Jun 2", state: "done"},
      {label: "Design", date: "Jun 18", state: "done"},
      {label: "Samples", date: "Jul 9", state: "done"},
      {label: "Production", date: "Aug", state: "done"},
      {label: "QC", date: "Sep 12", state: "done"},
      {label: "Delivered", date: "Sep 20", state: "done"},
    ],
    proofs: [{version: "v2", date: "Jul 2", note: "Approved", current: true}],
    files: [{name: "Packing-list.pdf", meta: "Sep 20"}],
  },
  {
    slug: "next-program",
    name: "[Next program]",
    line: "Kickoff call booked",
    meta: "Kickoff · Oct 14",
    stage: "Kickoff · Oct 14",
    status: "Starting",
    filled: 1,
    total: 6,
    eyebrow: "SLCC · Next program",
    title: "KICKOFF",
    deliveryLabel: "Delivery date open",
    deliveryDate: "TBD",
    phase: "STARTING",
    weekNote: "Kickoff call is on the books for Oct 14. No items yet.",
    weekAuthor: "Melanie · Volta",
    shipTo: "SLCC Athletics",
    shipNote: "Address confirmed at kickoff",
    items: [],
    roster: [],
    milestones: [
      {label: "Kickoff", date: "Oct 14", state: "now"},
      {label: "Design", date: "—", state: "next"},
      {label: "Samples", date: "—", state: "next"},
      {label: "Production", date: "—", state: "next"},
      {label: "QC", date: "—", state: "next"},
      {label: "Delivered", date: "—", state: "next"},
    ],
    proofs: [],
    files: [],
  },
];

export function getProgram(slug: string) {
  return programs.find((program) => program.slug === slug);
}

export const needsYou = [
  {
    href: "/approvals/away-kit",
    title: "Approve away kit v3",
    detail: "Women’s Soccer · 2 min",
    badge: "check" as const,
  },
  {
    href: "/programs/womens-soccer?tab=roster",
    title: "Athletes missing sizes",
    detail: "Women’s Soccer · due Oct 8",
    badge: "4" as const,
  },
  {
    href: "/programs/cross-country?tab=files",
    title: "Invoice ready for PO",
    detail: "Cross Country",
    badge: "doc" as const,
  },
];

export const updates = [
  {tone: "live" as const, text: "XC travel kits: printing done, sewing started.", when: "2h ago"},
  {tone: "idle" as const, text: "WSOC: proof v3 uploaded with your sleeve fix.", when: "Today"},
  {tone: "idle" as const, text: "Weekly digest sent to 3 coaches.", when: "Mon"},
];

export const storeProducts = [
  {id: "shirt", name: "Training shirt", price: 42, detail: "Cross Country travel kit"},
  {id: "hoodie", name: "Pullover hoodie", price: 68, detail: "Cross Country travel kit"},
  {id: "zip", name: "Quarter zip + jogger", price: 74, detail: "Cross Country travel kit"},
  {id: "coach", name: "Coaches kit", price: 96, detail: "Staff pack"},
];
