import { AlertTriangle, Search, ExternalLink } from "lucide-react";
import type { MatchResult } from "@/types";

interface ManualResearchProps {
  results: MatchResult[];
}

export function ManualResearch({ results }: ManualResearchProps) {
  const unmatched = results.filter((r) => !r.matched);

  if (unmatched.length === 0) return null;

  const buildBisSearchUrl = (material: string) => {
    return `https://www.bis.gov.in/?s=${encodeURIComponent(material)}`;
  };

  return (
    <section className="bg-white pt-6 pb-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-800 tracking-wide">
            REQUIRES MANUAL RESEARCH
          </h3>
        </div>
        <div className="space-y-3">
          {unmatched.map((result, idx) => (
            <div
              key={idx}
              className="border border-gray-200 border-l-4 border-l-amber-400 rounded-lg p-4 flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-navy-800 text-sm">{result.material}</p>
                <p className="text-xs text-gray-400">
                  Identified from procurement text
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  &mdash; No matching standard found in the current database.
                </p>
              </div>
              <a
                href={buildBisSearchUrl(result.material)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-amber-200 transition-colors whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5" />
                Search BIS
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
