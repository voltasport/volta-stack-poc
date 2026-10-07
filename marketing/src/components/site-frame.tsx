import Link from "next/link";

const PORTAL = "https://voltasport.vercel.app/login";

const links = [
  {href: "/how-it-works", label: "How it works"},
  {href: "/pricing", label: "Pricing"},
  {href: "/stores", label: "Team stores"},
  {href: "/about", label: "About"},
];

export function SiteHeader() {
  return (
    <section style={{background: "#101B2D", color: "#F6F4F0", padding: "20px 0 0"}}>
      <div className="wrap">
        <header
          className="site-header-pill"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "rgba(31,48,75,.7)",
            border: "1px solid #26395A",
            borderRadius: 999,
            padding: "8px 8px 8px 24px",
          }}
        >
          <Link href="/" aria-label="Volta home" style={{textDecoration: "none", color: "#F6F4F0"}}>
            <span className="disp" style={{fontSize: 30, letterSpacing: ".05em"}}>
              Volta
            </span>
          </Link>
          <nav aria-label="Main" style={{display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2}}>
            {links.map((link) => (
              <Link key={link.href} className="nl" href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <Link className="btn btn-g" href="/consult" style={{minHeight: 44}}>
            Book a consult
          </Link>
        </header>
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
            <Link key={link.href} href={link.href} style={{color: "#4A5566", textDecoration: "none"}}>
              {link.label}
            </Link>
          ))}
          <Link href="/consult" style={{color: "#4A5566", textDecoration: "none"}}>
            Contact
          </Link>
          <a href={PORTAL} style={{color: "#4A5566", textDecoration: "none"}}>
            Director login
          </a>
        </nav>
        <span>© 2026 Volta Sport · Built in Utah</span>
      </div>
    </footer>
  );
}
