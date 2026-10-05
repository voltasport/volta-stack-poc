import {ProofApproval} from "@/components/proof-approval";
import {Shell} from "@/components/shell";
import {currentEntity} from "@/lib/current-entity";

export const dynamic = "force-dynamic";

export default async function AwayKitPage() {
  const entity = await currentEntity();
  if (!entity.programs) {
    return (
      <Shell>
        <p className="text-sm text-[#6d7b8a]">{entity.name}</p>
        <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">APPROVALS</h1>
        <p className="mt-4 text-sm leading-6 text-[#3c4a5c]">
          Proofs in this portal are filed under SLCC Athletics.
        </p>
      </Shell>
    );
  }
  return <ProofApproval />;
}
