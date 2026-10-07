import Link from "next/link";
import {MarketingHeader} from "@/components/marketing-header";
import {portalLoginUrl} from "@/lib/site-urls";

const links = [
  {href: "/how-it-works", label: "How it works"},
  {href: "/pricing", label: "Pricing"},
  {href: "/stores", label: "Team stores"},
  {href: "/about", label: "About"},
];

export function SiteHeader({active}: {active?: string}) {
  return (
    <section style={{background: "#101B2D", color: "#F6F4F0", padding: "20px 0 0"}}>
      <div className="wrap">
        <MarketingHeader active={active} />
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer style={{color: "#4A5566", padding: "40px 0 48px", fontSize: 14, background: "#F6F4F0"}}>
      <div
        className="wrap"
        style={{display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20}}
      >
        <span className="disp" style={{fontSize: 32, color: "#101B2D", letterSpacing: ".05em"}}>
          Volta
        </span>
        <nav aria-label="Footer" style={{display: "flex", flexWrap: "wrap", gap: 24}}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="link-muted">
              {link.label}
            </Link>
          ))}
          <Link href="/consult" className="link-muted">
            Contact
          </Link>
          <Link href={portalLoginUrl} className="link-muted">
            Program portal
          </Link>
        </nav>
        <span>© 2026 Volta Sport</span>
      </div>
    </footer>
  );
}
