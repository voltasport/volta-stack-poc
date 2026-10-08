export type SizedItemPreset = {
  id: string;
  label: string;
  items: {name: string; sizeOptions: string[]}[];
};

export const ADULT_YOUTH_APPAREL = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL"] as const;

export const SIZED_ITEM_PRESETS: SizedItemPreset[] = [
  {
    id: "default-kit",
    label: "Jersey + Short (youth & adult)",
    items: [
      {name: "Jersey", sizeOptions: [...ADULT_YOUTH_APPAREL]},
      {name: "Short", sizeOptions: [...ADULT_YOUTH_APPAREL]},
    ],
  },
  {
    id: "adult-apparel",
    label: "Adult apparel",
    items: [{name: "Top", sizeOptions: ["XS", "S", "M", "L", "XL", "2XL", "3XL"]}],
  },
  {
    id: "youth-apparel",
    label: "Youth apparel",
    items: [{name: "Top", sizeOptions: ["YXS", "YS", "YM", "YL", "YXL"]}],
  },
  {
    id: "hats",
    label: "Hats",
    items: [{name: "Hat", sizeOptions: ["S/M", "L/XL", "One size"]}],
  },
  {
    id: "socks",
    label: "Socks",
    items: [{name: "Socks", sizeOptions: ["S", "M", "L", "One size"]}],
  },
];

export function presetById(id: string) {
  return SIZED_ITEM_PRESETS.find((preset) => preset.id === id);
}
