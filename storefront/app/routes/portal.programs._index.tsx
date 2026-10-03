import {Link} from 'react-router';
import {programs} from '~/lib/portal-data';
import {PortalShell, StatusPill} from '~/components/portal/PortalShell';

export default function PortalPrograms() {
  return (
    <PortalShell>
      <p className="text-sm text-[#6d7b8a]">SLCC Athletics</p>
      <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">PROGRAMS</h1>
      <ul className="mt-6 overflow-hidden rounded-3xl bg-white">
        {programs.map((program) => (
          <li key={program.slug} className="border-t border-[#f0ece4] first:border-t-0">
            <Link
              to={`/portal/programs/${program.slug}`}
              className="flex items-center justify-between px-5 py-4 no-underline"
            >
              <span>
                <span className="block font-semibold text-[#122033]">{program.name}</span>
                <span className="text-sm text-[#6d7b8a]">{program.line}</span>
              </span>
              <StatusPill status={program.status} />
            </Link>
          </li>
        ))}
      </ul>
    </PortalShell>
  );
}
