import {Shell} from "@/components/shell";
import {RequestsAdmin} from "@/components/requests-admin";
import {requireAdmin, resolveCurrentEntity} from "@/lib/access";
import {createShellConfig} from "@/lib/shell-config";
import {getShellMetrics} from "@/lib/shell-metrics";
import {listPortalRequestsForAdmin} from "@/lib/portal-requests";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const access = await requireAdmin();
  const entity = await resolveCurrentEntity(access);
  const metrics = await getShellMetrics(access, entity);
  const shellConfig = createShellConfig(access, entity, metrics);
  const {ready, requests} = await listPortalRequestsForAdmin();

  return (
    <Shell config={shellConfig}>
      <h1 className="text-4xl font-black tracking-[-0.04em]">REQUESTS</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#3c4a5c]">
        Onboarding requests from directors and managers. Mark done when fulfilled — school requests
        create an organization record for the user.
      </p>
      <RequestsAdmin
        ready={ready}
        requests={requests.map((row) => ({
          ...row,
          payload: row.payload ?? {},
        }))}
      />
    </Shell>
  );
}
