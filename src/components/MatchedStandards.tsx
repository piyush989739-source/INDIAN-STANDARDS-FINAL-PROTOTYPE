import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import type { MatchResult } from "@/types";

interface MatchedStandardsProps {
  results: MatchResult[];
}

export function MatchedStandards({ results }: MatchedStandardsProps) {
  const matched = results.filter((r) => r.matched);

  if (matched.length === 0) return null;

  return (
    <section className="bg-white pt-8 pb-4">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <h3 className="text-sm font-bold text-gray-800 tracking-wide">
            MATCHED STANDARDS
          </h3>
        </div>
        <div className="flex justify-end gap-8 text-xs font-semibold text-gray-400 mb-2 pr-2">
          <span>Standard</span>
          <span>Status</span>
        </div>
        <div className="space-y-3">
          {matched.map((result, idx) => (
            <MatchedRow key={idx} result={result} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MatchedRow({ result }: { result: MatchResult }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.standard_number || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-navy-800 text-sm">{result.material}</p>
          <p className="text-xs text-gray-400">Identified from procurement text</p>
        </div>
        <div className="text-right min-w-[160px]">
          <p className="font-bold text-navy-800 text-sm">
            {result.standard_number}
          </p>
          <p className="text-xs text-gray-400 truncate">{result.title}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
            Matched
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title="Copy standard number"
          >
            <Copy className={`w-4 h-4 ${copied ? "text-green-600" : "text-gray-400"}`} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-navy-700 hover:text-navy-900 font-medium transition-colors"
          >
            Details
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-4 flex gap-8 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs font-semibold text-gray-500 mb-1">Scope</p>
            <p className="text-sm text-gray-700">
              {result.scope_summary || "No scope information available."}
            </p>
          </div>
          <div className="flex flex-col gap-3 min-w-[200px]">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Revision</p>
              <p className="text-sm text-gray-700">
                {result.revision_year || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Source</p>
              {result.source_link ? (
                <a
                  href={result.source_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-navy-700 hover:text-navy-900 flex items-center gap-1 font-medium"
                >
                  View on BIS
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <p className="text-sm text-gray-400">N/A</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
