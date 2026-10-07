import {Shell} from "@/components/shell";
import {requireAdmin, resolveCurrentEntity} from "@/lib/access";
import {createShellConfig} from "@/lib/shell-config";
import {getShellMetrics} from "@/lib/shell-metrics";

export const dynamic = "force-dynamic";

export default async function ArtworkLockerPage() {
  const access = await requireAdmin();
  const entity = await resolveCurrentEntity(access);
  const metrics = await getShellMetrics(access, entity);
  const shellConfig = createShellConfig(access, entity, metrics);

  return (
    <Shell config={shellConfig}>
      <h1 className="text-4xl font-black tracking-[-0.04em]">ARTWORK LOCKER</h1>
      <p className="mt-6 rounded-3xl bg-white px-6 py-10 text-center text-lg font-semibold text-[#3c4a5c]">
        work here
      </p>
    </Shell>
  );
}
