import { Info } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500">
            Standards information should be verified against the latest
            applicable BIS publication before procurement.
          </p>
        </div>
        <p className="text-xs text-gray-400">Source: bis.gov.in</p>
      </div>
    </footer>
  );
}
