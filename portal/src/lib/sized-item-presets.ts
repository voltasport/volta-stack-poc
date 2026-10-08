export type SizedItemPreset = {
  id: string;
  label: string;
  items: {name: string; sizeOptions: string[]}[];
};

export const ADULT_YOUTH_APPAREL = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL"] as const;

/** Kit presets offered on the program Items tab and when creating a program. */
export const SIZED_ITEM_PRESETS: SizedItemPreset[] = [
  {
    id: "default-kit",
    label: "Jersey + Short",
    items: [
      {name: "Jersey", sizeOptions: [...ADULT_YOUTH_APPAREL]},
      {name: "Short", sizeOptions: [...ADULT_YOUTH_APPAREL]},
    ],
  },
  {
    id: "hoodie",
    label: "Hoodie",
    items: [{name: "Hoodie", sizeOptions: [...ADULT_YOUTH_APPAREL]}],
  },
  {
    id: "hats",
    label: "Hat",
    items: [{name: "Hat", sizeOptions: ["S/M", "L/XL", "One size"]}],
  },
  {
    id: "socks",
    label: "Socks",
    items: [{name: "Socks", sizeOptions: ["S", "M", "L"]}],
  },
  {
    id: "bag",
    label: "Bag (no sizes)",
    items: [{name: "Bag", sizeOptions: []}],
  },
];

export function presetById(id: string) {
  return SIZED_ITEM_PRESETS.find((preset) => preset.id === id);
}
