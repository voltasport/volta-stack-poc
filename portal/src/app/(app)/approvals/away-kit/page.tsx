import {ProofApproval} from "@/components/proof-approval";
import {Shell} from "@/components/shell";
import {requireAdmin, resolveCurrentEntity} from "@/lib/access";
import {createShellConfig} from "@/lib/shell-config";
import {getShellMetrics} from "@/lib/shell-metrics";

export const dynamic = "force-dynamic";

export default async function AwayKitPage() {
  const access = await requireAdmin();
  const entity = await resolveCurrentEntity(access);
  const metrics = await getShellMetrics(access, entity);
  const shellConfig = createShellConfig(access, entity, metrics);

  return (
    <Shell config={shellConfig} flush>
      <ProofApproval />
    </Shell>
  );
}
