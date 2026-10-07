export const portalRoles = ["admin", "director", "manager"] as const;
export type PortalRole = (typeof portalRoles)[number];

export function parsePortalRole(value: string | undefined | null): PortalRole {
  if (value === "admin" || value === "director" || value === "manager") {
    return value;
  }
  return "director";
}

export function isPortalRole(value: string): value is PortalRole {
  return portalRoles.includes(value as PortalRole);
}
