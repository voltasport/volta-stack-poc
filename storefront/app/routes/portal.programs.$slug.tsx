import {useParams, useSearchParams} from 'react-router';
import {ProgramDetail} from '~/components/portal/ProgramDetail';
import {PortalShell} from '~/components/portal/PortalShell';
import {getProgram} from '~/lib/portal-data';

export default function PortalProgram() {
  const {slug} = useParams();
  const [search] = useSearchParams();
  const program = getProgram(slug ?? '');

  if (!program) {
    return (
      <PortalShell>
        <p>That program is not in this proof.</p>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <ProgramDetail program={program} initialTab={search.get('tab') ?? undefined} />
    </PortalShell>
  );
}
