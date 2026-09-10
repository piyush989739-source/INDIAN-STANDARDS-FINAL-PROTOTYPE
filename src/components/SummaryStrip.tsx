import { FileText, CheckCircle2, AlertTriangle } from "lucide-react";

interface SummaryStripProps {
  totalMaterials: number;
  matchedCount: number;
  manualResearchCount: number;
}

export function SummaryStrip({
  totalMaterials,
  matchedCount,
  manualResearchCount,
}: SummaryStripProps) {
  return (
    <section className="bg-gray-100 border-y border-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-5">
        <div className="flex items-center justify-center gap-8 flex-wrap">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-navy-700" />
            <div>
              <span className="text-xl font-bold text-navy-800">
                {totalMaterials}
              </span>
              <span className="text-sm text-gray-600 ml-1.5">
                {totalMaterials === 1 ? "Material" : "Materials"} identified
              </span>
            </div>
          </div>
          <div className="w-px h-10 bg-gray-300" />
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <span className="text-xl font-bold text-navy-800">
                {matchedCount}
              </span>
              <span className="text-sm text-gray-600 ml-1.5">
                {matchedCount === 1 ? "Standard" : "Standards"} matched
              </span>
            </div>
          </div>
          <div className="w-px h-10 bg-gray-300" />
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-xl font-bold text-navy-800">
                {manualResearchCount}
              </span>
              <span className="text-sm text-gray-600 ml-1.5">
                {manualResearchCount === 1 ? "Requires" : "Require"} manual research
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
