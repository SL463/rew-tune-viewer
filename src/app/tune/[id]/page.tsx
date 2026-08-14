import Link from "next/link";
import { notFound } from "next/navigation";
import { getTuneMeta } from "@/lib/store";
import TuneViewer from "@/components/TuneViewer";

export const dynamic = "force-dynamic";

export default async function TunePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meta = await getTuneMeta(id);
  if (!meta) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Tunes
        </Link>
        <h1 className="text-xl font-semibold text-white">{meta.name}</h1>
        <span className="text-xs text-slate-500">
          {meta.measCount} measurements
        </span>
      </div>
      <TuneViewer name={meta.name} dataUrl={meta.dataUrl} />
    </div>
  );
}
