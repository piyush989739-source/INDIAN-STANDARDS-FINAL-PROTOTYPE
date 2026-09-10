import { useState } from "react";
import { Lightbulb, Search, ArrowRight } from "lucide-react";

interface SearchSectionProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

const EXAMPLE_QUERY =
  "We need 500 tonnes of TMT steel bars of grade Fe 500D for construction of a bridge, along with 2000 bags of Ordinary Portland Cement (OPC) grade 43, and 5000 sq.m of waterproofing membrane for the deck surface.";

export function SearchSection({ onSearch, loading }: SearchSectionProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onSearch(query.trim());
    }
  };

  return (
    <section className="bg-white pt-10 pb-8">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-2xl font-bold text-navy-800 mb-2">
          What are you procuring?
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Describe your requirement in plain language. Include materials,
          components and any specific details.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3 items-stretch">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. We need 500 tonnes of TMT steel bars grade Fe 500D, 2000 bags of OPC cement grade 43, and waterproofing membrane..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-transparent placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 bg-navy-800 hover:bg-navy-900 disabled:bg-gray-400 text-white font-semibold text-sm px-6 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              Find Standards
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
        <div className="flex items-start gap-2 mt-4">
          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-400">
            Try: "{EXAMPLE_QUERY}"
          </p>
        </div>
      </div>
    </section>
  );
}
