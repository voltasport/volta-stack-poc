"use client";

import Link from "next/link";
import {useEffect, useId, useState} from "react";

const links = [
  {href: "/how-it-works", label: "How it works"},
  {href: "/pricing", label: "Pricing"},
  {href: "/stores", label: "Team stores"},
  {href: "/about", label: "About"},
];

export function MarketingHeader({active}: {active?: string}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  return (
    <header className="marketing-header">
      <Link href="/" aria-label="Volta home" className="marketing-header-logo">
        <span className="disp">Volta</span>
      </Link>
      <button
        type="button"
        className="marketing-nav-toggle"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close" : "Menu"}
      </button>
      <nav id={menuId} aria-label="Main" className={`marketing-nav${open ? " is-open" : ""}`}>
        {links.map((link) => (
          <Link
            key={link.href}
            className={`nl${active === link.href ? " nl-active" : ""}`}
            href={link.href}
            aria-current={active === link.href ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <Link
          className="btn btn-g marketing-nav-cta-mobile"
          href="/consult"
          onClick={() => setOpen(false)}
        >
          Book a consult
        </Link>
      </nav>
      <Link className="btn btn-g marketing-header-cta" href="/consult">
        Book a consult
      </Link>
    </header>
  );
}
