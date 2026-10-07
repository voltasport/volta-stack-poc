export type CatalogEntity = {
  slug: string;
  name: string;
  short: string;
  /** Program, proof, and roster work for this school lives in the director portal. */
  programs: boolean;
  match: RegExp | null;
};

export const entities: CatalogEntity[] = [
  {
    slug: "slcc",
    name: "SLCC Athletics",
    short: "SL",
    programs: true,
    match: /\bslcc\b|salt lake community/i,
  },
  {
    slug: "davis",
    name: "Davis High School",
    short: "DA",
    programs: true,
    match: /\bdavis\b/i,
  },
  {
    slug: "utah-prep",
    name: "Utah Prep FC",
    short: "UP",
    programs: false,
    match: /utah prep/i,
  },
  {
    slug: "utah-united",
    name: "Utah United",
    short: "UU",
    programs: false,
    match: /utah united/i,
  },
  {
    slug: "demand-excellence",
    name: "Demand Excellence",
    short: "DE",
    programs: false,
    match: /demand excellence/i,
  },
  {
    slug: "other",
    name: "Other Volta gear",
    short: "VO",
    programs: false,
    match: null,
  },
];

/** Portal-only view. Not a Shopify school, so it stays out of `entities`. */
export const allSchools: CatalogEntity = {
  slug: "all",
  name: "All schools",
  short: "ALL",
  programs: true,
  match: null,
};

/** Schools/orgs in the sidebar picker — not “All schools”, not the catalog-only “other” bucket. */
export function sidebarSchoolEntities(): CatalogEntity[] {
  return entities.filter((entity) => entity.slug !== "other");
}

export function entityBySlug(slug: string | undefined) {
  if (slug === allSchools.slug) return allSchools;
  return entities.find((entity) => entity.slug === slug) ?? entities[0];
}

export function entityForProduct(title: string, vendor: string) {
  const haystack = `${title} ${vendor}`;
  return (
    entities.find((entity) => entity.match?.test(haystack)) ??
    entities.find((entity) => entity.slug === "other")!
  );
}

export function productsForEntity<T extends {title: string; vendor: string}>(
  products: T[],
  slug: string,
) {
  if (slug === allSchools.slug) return products;
  return products.filter((product) => entityForProduct(product.title, product.vendor).slug === slug);
}
