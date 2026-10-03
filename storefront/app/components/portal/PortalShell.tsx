import {Link, useLocation, useSearchParams} from 'react-router';

const nav = [
  {href: '/portal', label: 'Overview', match: 'exact' as const},
  {href: '/portal/programs', label: 'Programs', count: '4', match: 'programs' as const},
  {
    href: '/portal/approvals/away-kit',
    label: 'Approvals',
    count: '1',
    alert: true,
    match: 'prefix' as const,
  },
  {
    href: '/portal/programs/womens-soccer?tab=roster',
    label: 'Rosters',
    count: '4',
    alert: true,
    match: 'roster' as const,
  },
  {href: '/', label: 'Team stores', match: 'shop' as const},
  {
    href: '/portal/programs/cross-country?tab=files',
    label: 'Invoices',
    match: 'none' as const,
  },
  {
    href: '/portal/programs/cross-country?tab=files',
    label: 'Artwork locker',
    match: 'none' as const,
  },
];

export function PortalShell({children}: {children: React.ReactNode}) {
  const pathname = useLocation().pathname;
  const [search] = useSearchParams();
  const tab = search.get('tab');

  return (
    <div
      className="volta-portal flex min-h-screen bg-[#f3f0e8] text-[#122033]"
      style={{fontFamily: '"Inter Tight", system-ui, sans-serif'}}
    >
      <aside className="flex w-[240px] shrink-0 flex-col bg-[#0c1726] text-white">
        <div className="flex items-center gap-2 px-5 pt-5">
          <span className="text-[15px] font-extrabold tracking-[0.14em]">VOLTA</span>
          <span className="rounded-full bg-[#16304a] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#9eb6c9]">
            PORTAL
          </span>
        </div>
        <div className="mx-3 mt-4 flex items-center gap-2 rounded-xl bg-[#163024] px-3 py-2 text-left">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#3dcb7a] text-[11px] font-bold text-[#0c1726]">
            SL
          </span>
          <span className="flex-1 text-sm font-semibold">SLCC Athletics</span>
          <span className="text-[#8aa0b5]">▾</span>
        </div>
        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => {
            const active =
              item.match === 'exact'
                ? pathname === '/portal'
                : item.match === 'programs'
                  ? pathname.startsWith('/portal/programs') && tab !== 'roster'
                  : item.match === 'roster'
                    ? tab === 'roster'
                    : item.match === 'prefix'
                      ? pathname.startsWith(item.href)
                      : false;
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm no-underline ${
                  active ? 'bg-[#1a3048] font-semibold text-white' : 'text-[#c5d2df]'
                }`}
              >
                <span>{item.label}</span>
                {item.count ? (
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ${
                      item.alert ? 'bg-[#3dcb7a] text-[#0c1726]' : 'text-[#8aa0b5]'
                    }`}
                  >
                    {item.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 flex items-center gap-3 rounded-2xl bg-[#13283a] p-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#24384c] text-[11px] font-bold">
            MO
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Melanie</p>
            <p className="text-[11px] text-[#9eb0c2]">your rep · replies in ~10 min</p>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-[#e4dfd4] bg-[#f7f4ee] px-6 py-2 text-xs text-[#5d6b7a]">
          <p>
            <span className="font-semibold text-[#122033]">Hydrogen + Shopify.</span> This portal is custom React. Team stores opens the live Shopify catalog.
          </p>
          <a
            href="http://localhost:3000"
            className="shrink-0 font-semibold text-[#147a45] no-underline"
          >
            Open the Next.js proof
          </a>
        </div>
        <div className="flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function StatusPill({status}: {status: string}) {
  const styles: Record<string, string> = {
    'On track': 'bg-[#e5f6ea] text-[#187243]',
    'Needs you': 'bg-[#f8efd0] text-[#8a6914]',
    Complete: 'bg-[#eef1f4] text-[#3c4a5c]',
    Starting: 'bg-[#e8eef6] text-[#3d5678]',
  };
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] ?? styles.Complete}`}
    >
      {status}
    </span>
  );
}

export function Segments({filled, total}: {filled: number; total: number}) {
  return (
    <div className="flex gap-1">
      {Array.from({length: total}).map((_, index) => (
        <span
          key={index}
          className={`h-1.5 w-7 rounded-full ${index < filled ? 'bg-[#3cba6f]' : 'bg-[#e6e1d8]'}`}
        />
      ))}
    </div>
  );
}
