"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

function revealNodes(nodes: HTMLElement[]) {
  nodes.forEach((node) => node.classList.add("rv-in"));
}

function isInRevealViewport(node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  const bottomInset = window.innerHeight * 0.08;
  return rect.top < window.innerHeight - bottomInset && rect.bottom > 0;
}

function observeRevealNodes(): () => void {
  const pending = Array.from(document.querySelectorAll<HTMLElement>(".rv:not(.rv-in)"));
  if (!pending.length) return () => {};

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    revealNodes(pending);
    return () => {};
  }

  const stillPending = pending.filter((node) => {
    if (isInRevealViewport(node)) {
      node.classList.add("rv-in");
      return false;
    }
    return true;
  });

  if (!stillPending.length) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("rv-in");
          observer.unobserve(entry.target);
        }
      });
    },
    {rootMargin: "0px 0px -8% 0px", threshold: 0.08},
  );

  stillPending.forEach((node) => observer.observe(node));

  const fallback = window.setTimeout(() => {
    revealNodes(Array.from(document.querySelectorAll<HTMLElement>(".rv:not(.rv-in)")));
  }, 3500);

  return () => {
    observer.disconnect();
    window.clearTimeout(fallback);
  };
}

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.add("scroll-reveal-js");

    let dispose = () => {};
    const arm = () => {
      dispose();
      dispose = observeRevealNodes();
    };

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(arm);
    });

    return () => {
      cancelAnimationFrame(raf);
      dispose();
    };
  }, [pathname]);

  return null;
}
