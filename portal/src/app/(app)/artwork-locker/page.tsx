import {Shell} from "@/components/shell";
import {requireAdmin} from "@/lib/access";
import {createShellConfig} from "@/lib/shell-config";
import {getProgramSlugs, getPrograms, getTasks} from "@/lib/queries";
import {resolveCurrentEntity} from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function ArtworkLockerPage() {
  const access = await requireAdmin();
  const entity = await resolveCurrentEntity(access);
  const programs = await getPrograms(access);
  const tasks = await getTasks(access);
  const rosterSlug = programs[0]?.slug ?? (await getProgramSlugs(access))[0];
  const shellConfig = createShellConfig(access, entity, programs.length, tasks.length, rosterSlug);

  return (
    <Shell config={shellConfig}>
      <h1 className="text-4xl font-black tracking-[-0.04em]">ARTWORK LOCKER</h1>
      <p className="mt-6 rounded-3xl bg-white px-6 py-10 text-center text-lg font-semibold text-[#3c4a5c]">
        work here
      </p>
    </Shell>
  );
}
