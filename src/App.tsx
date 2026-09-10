import { useState } from "react";
import { Header } from "@/components/Header";
import { SearchSection } from "@/components/SearchSection";
import { SummaryStrip } from "@/components/SummaryStrip";
import { MatchedStandards } from "@/components/MatchedStandards";
import { ManualResearch } from "@/components/ManualResearch";
import { Footer } from "@/components/Footer";
import { ManageData } from "@/components/ManageData";
import { Loader2, Bug, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { MatchResult } from "@/types";

type Page = "search" | "manage";

interface DebugInfo {
  aiKeyPresent?: string;
  aiKeyLength?: string;
  queryLength?: string;
  extractionMethod?: string;
  materialsExtracted?: string;
  materials?: string;
  matchedCount?: string;
  unmatchedCount?: string;
  aiError?: string;
}

export default function App() {
  const [page, setPage] = useState<Page>("search");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setDebug(null);
    setExtractionError(null);

    console.log("[App] Search triggered, query:", query);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const endpoint = `${supabaseUrl}/functions/v1/match-standards`;
      console.log("[App] Calling edge function:", endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ query }),
      });

      console.log("[App] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[App] Edge function returned error:", response.status, errorText);
        throw new Error(`Request failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log("[App] Response data:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.results || []);
      setDebug(data.debug || null);
      setExtractionError(data.extractionError || null);
    } catch (err) {
      console.error("[App] Search error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to search for standards"
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (page === "manage") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onNavigate={setPage} currentPage={page} />
        <ManageData onBack={() => setPage("search")} />
        <Footer />
      </div>
    );
  }

  const matchedCount = results.filter((r) => r.matched).length;
  const manualResearchCount = results.filter((r) => !r.matched).length;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header onNavigate={setPage} currentPage={page} />
      <SearchSection onSearch={handleSearch} loading={loading} />

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-navy-700 animate-spin mb-3" />
          <p className="text-sm text-gray-500">
            Analyzing your procurement text and matching standards...
          </p>
        </div>
      )}

      {error && (
        <div className="max-w-4xl mx-auto px-6 py-8 w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">
              Something went wrong: {error}
            </p>
            <p className="text-xs text-red-400 mt-1">
              Please try again. If the problem persists, check that the AI API
              key is configured.
            </p>
          </div>
        </div>
      )}

      {/* Extraction warning (AI failed but fallback was used) */}
      {!loading && !error && extractionError && hasSearched && results.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pt-6 w-full">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-700 font-medium">
                AI extraction encountered an error — using basic keyword extraction instead.
              </p>
              <p className="text-xs text-amber-600 mt-1 font-mono">{extractionError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Debug panel toggle */}
      {!loading && hasSearched && debug && (
        <div className="max-w-4xl mx-auto px-6 pt-4 w-full">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Bug className="w-4 h-4" />
            {showDebug ? "Hide" : "Show"} debug info
          </button>

          {showDebug && (
            <div className="mt-3 bg-gray-900 rounded-lg p-4 relative">
              <button
                onClick={() => setShowDebug(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="space-y-1.5 text-xs font-mono">
                <DebugRow label="AI Key Present" value={debug.aiKeyPresent} />
                <DebugRow label="AI Key Length" value={debug.aiKeyLength} />
                <DebugRow label="Query Length" value={debug.queryLength} />
                <DebugRow label="Extraction Method" value={debug.extractionMethod} />
                <DebugRow label="Materials Extracted" value={debug.materialsExtracted} />
                <DebugRow label="Matched Count" value={debug.matchedCount} />
                <DebugRow label="Unmatched Count" value={debug.unmatchedCount} />
                {debug.aiError && (
                  <div className="pt-2 border-t border-gray-700">
                    <span className="text-red-400">AI Error: </span>
                    <span className="text-red-300">{debug.aiError}</span>
                  </div>
                )}
                {debug.materials && (
                  <div className="pt-2 border-t border-gray-700">
                    <span className="text-green-400">Extracted Materials: </span>
                    <span className="text-green-300">{debug.materials}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extracted keywords preview (shows temporarily after search) */}
      {!loading && !error && hasSearched && results.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pt-4 w-full">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2 flex-wrap">
            <span className="text-xs font-semibold text-navy-700 pt-0.5">
              Extracted keywords:
            </span>
            {results.map((r, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  r.matched
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {r.matched && <CheckCircle2 className="w-3 h-3" />}
                {r.material}
              </span>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && hasSearched && results.length > 0 && (
        <>
          <SummaryStrip
            totalMaterials={results.length}
            matchedCount={matchedCount}
            manualResearchCount={manualResearchCount}
          />
          <MatchedStandards results={results} />
          <ManualResearch results={results} />
        </>
      )}

      {!loading && !error && hasSearched && results.length === 0 && (
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No materials were identified in your search. Try rephrasing your
            procurement description with more specific material names.
          </p>
          {debug && (
            <p className="text-xs text-gray-400 mt-2 font-mono">
              Debug: method={debug.extractionMethod}, key={debug.aiKeyPresent}
            </p>
          )}
        </div>
      )}

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-gray-400">{label}: </span>
      <span className="text-gray-200">{value ?? "—"}</span>
    </div>
  );
}
