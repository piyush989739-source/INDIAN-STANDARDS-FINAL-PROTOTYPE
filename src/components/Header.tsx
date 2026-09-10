import { Shield, LayoutGrid } from "lucide-react";

interface HeaderProps {
  onNavigate: (page: "search" | "manage") => void;
  currentPage: "search" | "manage";
}

export function Header({ onNavigate, currentPage }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => onNavigate("search")}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="relative">
            <Shield className="w-9 h-9 text-navy-800" fill="currentColor" strokeWidth={1} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-red-600 rounded-sm" />
            </div>
          </div>
          <div className="text-left">
            <h1 className="text-lg font-bold text-navy-800 leading-tight">
              IS Standards Finder
            </h1>
            <p className="text-xs text-gray-500 leading-tight">
              Indian Standards Recommendation Engine
              <br />
              for Procurement Officers
            </p>
          </div>
        </button>
        <button
          onClick={() => onNavigate(currentPage === "search" ? "manage" : "search")}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title={currentPage === "search" ? "Manage Data" : "Back to Search"}
        >
          <LayoutGrid className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </header>
  );
}
