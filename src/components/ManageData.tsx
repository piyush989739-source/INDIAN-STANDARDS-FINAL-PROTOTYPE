import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import type { Standard } from "@/types";
import {
  Upload,
  ClipboardPaste,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Trash2,
} from "lucide-react";

interface ManageDataProps {
  onBack: () => void;
}

interface ParsedRow {
  standard_number: string;
  title: string;
  category: string;
  product_type: string;
  keywords: string[];
  scope_summary: string;
  source_link: string;
  revision_year: number | null;
  status: string;
  _errors: string[];
}

const REQUIRED_FIELDS = ["standard_number", "title"];
const FIELD_LABELS: Record<string, string> = {
  standard_number: "Standard Number",
  title: "Title",
  category: "Category",
  product_type: "Product Type",
  keywords: "Keywords",
  scope_summary: "Scope Summary",
  source_link: "Source Link",
  revision_year: "Revision Year",
  status: "Status",
};

export function ManageData({ onBack }: ManageDataProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [pasteText, setPasteText] = useState("");
  const [standardsCount, setStandardsCount] = useState<number | null>(null);

  const parseRow = (raw: Record<string, unknown>): ParsedRow => {
    const errors: string[] = [];

    // Helper to get value case-insensitively
    const getField = (name: string): string => {
      const key = Object.keys(raw).find(
        (k) => k.toLowerCase().trim() === name.toLowerCase()
      );
      return key ? String(raw[key] ?? "").trim() : "";
    };

    const standard_number = getField("standard_number");
    const title = getField("title");
    const category = getField("category");
    const product_type = getField("product_type");
    const keywordsRaw = getField("keywords");
    const scope_summary = getField("scope_summary");
    const source_link = getField("source_link");
    const revisionYearRaw = getField("revision_year");
    const status = getField("status") || "active";

    if (!standard_number) errors.push("Missing standard_number");
    if (!title) errors.push("Missing title");

    const keywords = keywordsRaw
      ? keywordsRaw.split(/[,;|]/).map((k) => k.trim()).filter(Boolean)
      : [];

    let revision_year: number | null = null;
    if (revisionYearRaw) {
      const parsed = parseInt(revisionYearRaw, 10);
      if (!isNaN(parsed)) revision_year = parsed;
    }

    return {
      standard_number,
      title,
      category,
      product_type,
      keywords,
      scope_summary,
      source_link,
      revision_year,
      status,
      _errors: errors,
    };
  };

  const parseSpreadsheetData = (data: Record<string, unknown>[]) => {
    const rows = data.map(parseRow);
    setParsedRows(rows);
    setImportResult(null);
  };

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        parseSpreadsheetData(json);
      } catch {
        setImportResult({
          success: 0,
          failed: 0,
          errors: ["Failed to parse the file. Please ensure it's a valid .xlsx or .csv file."],
        });
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handlePasteParse = () => {
    if (!pasteText.trim()) return;
    try {
      // Parse tab-separated or comma-separated pasted data
      const lines = pasteText.trim().split(/\n/);
      if (lines.length === 0) return;

      // Detect delimiter from first line
      const delimiter = lines[0].includes("\t") ? "\t" : ",";
      const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

      const data: Record<string, unknown>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        const row: Record<string, unknown> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx]?.trim() ?? "";
        });
        data.push(row);
      }
      parseSpreadsheetData(data);
    } catch {
      setImportResult({
        success: 0,
        failed: 0,
        errors: ["Failed to parse pasted data. Ensure the first row has column headers."],
      });
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);

    const validRows = parsedRows.filter((r) => r._errors.length === 0);
    const invalidRows = parsedRows.filter((r) => r._errors.length > 0);

    if (validRows.length === 0) {
      setImportResult({
        success: 0,
        failed: invalidRows.length,
        errors: ["No valid rows to import. Please fix the errors and try again."],
      });
      setImporting(false);
      return;
    }

    const rowsToInsert = validRows.map((r) => ({
      standard_number: r.standard_number,
      title: r.title,
      category: r.category || null,
      product_type: r.product_type || null,
      keywords: r.keywords,
      scope_summary: r.scope_summary || null,
      source_link: r.source_link || null,
      revision_year: r.revision_year,
      status: r.status || "active",
    }));

    const { error } = await supabase.from("standards").insert(rowsToInsert);

    if (error) {
      setImportResult({
        success: 0,
        failed: validRows.length,
        errors: [error.message],
      });
    } else {
      setImportResult({
        success: validRows.length,
        failed: invalidRows.length,
        errors: invalidRows.map((r) => `Row "${r.standard_number || "(no number)"}": ${r._errors.join(", ")}`),
      });
      setParsedRows([]);
      setPasteText("");
      // Refresh count
      const { count } = await supabase
        .from("standards")
        .select("*", { count: "exact", head: true });
      setStandardsCount(count ?? null);
    }
    setImporting(false);
  };

  const fetchCount = async () => {
    const { count } = await supabase
      .from("standards")
      .select("*", { count: "exact", head: true });
    setStandardsCount(count ?? null);
  };

  // Fetch count on first render
  useState(() => {
    fetchCount();
  });

  const validCount = parsedRows.filter((r) => r._errors.length === 0).length;
  const errorCount = parsedRows.filter((r) => r._errors.length > 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </button>

        <h2 className="text-2xl font-bold text-navy-800 mb-2">Manage Standards Data</h2>
        <p className="text-gray-500 text-sm mb-6">
          Add Indian Standards to the database via file upload or by pasting data
          directly from Excel.
          {standardsCount !== null && (
            <span className="ml-1">
              Currently <span className="font-semibold text-navy-700">{standardsCount}</span> standards in the database.
            </span>
          )}
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "upload"
                ? "border-navy-700 text-navy-700"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Upload className="w-4 h-4" />
            File Upload
          </button>
          <button
            onClick={() => setActiveTab("paste")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "paste"
                ? "border-navy-700 text-navy-700"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste Data
          </button>
        </div>

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-navy-400 transition-colors cursor-pointer"
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-600 mb-1">
              Drag and drop a .xlsx or .csv file here
            </p>
            <p className="text-xs text-gray-400">
              or click to browse. The file should have headers matching the
              database columns.
            </p>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Paste Tab */}
        {activeTab === "paste" && (
          <div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Paste data here. First line should be column headers (tab or comma separated):\n\nstandard_number\ttitle\tcategory\tproduct_type\tkeywords\tscope_summary\nIS 1786\tHigh strength deformed steel bars...\tSteel\tTMT Bars\ttmt,steel,bars\tThis standard covers deformed steel bars...\nIS 456\tPlain and reinforced concrete...\tConstruction\tCement\tcement,concrete\tThis standard deals with...`}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 font-mono min-h-[200px] resize-y focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-transparent placeholder:text-gray-400"
            />
            <button
              onClick={handlePasteParse}
              disabled={!pasteText.trim()}
              className="mt-3 flex items-center gap-2 bg-navy-800 hover:bg-navy-900 disabled:bg-gray-400 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              <ClipboardPaste className="w-4 h-4" />
              Parse Pasted Data
            </button>
          </div>
        )}

        {/* Preview Table */}
        {parsedRows.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">
                Preview ({parsedRows.length} rows)
              </h3>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  {validCount} valid
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1.5 text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    {errorCount} with errors
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                      Standard #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                      Title
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                      Category
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                      Product Type
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                      Keywords
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-gray-100 ${
                        row._errors.length > 0 ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-3 py-2">
                        {row._errors.length > 0 ? (
                          <span className="text-xs text-red-500" title={row._errors.join(", ")}>
                            <AlertCircle className="w-4 h-4" />
                          </span>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700 font-mono text-xs">
                        {row.standard_number || (
                          <span className="text-red-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                        {row.title || (
                          <span className="text-red-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {row.category || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {row.product_type || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs max-w-[150px] truncate">
                        {row.keywords.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Error details */}
            {errorCount > 0 && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-600 mb-1">
                  Rows with missing required fields:
                </p>
                <ul className="text-xs text-red-500 space-y-0.5">
                  {parsedRows
                    .filter((r) => r._errors.length > 0)
                    .map((r, idx) => (
                      <li key={idx}>
                        Row {idx + 1}: {r._errors.join(", ")}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Import button */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {importing ? "Importing..." : `Import ${validCount} Valid Rows`}
              </button>
              <button
                onClick={() => setParsedRows([])}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div
            className={`mt-6 p-4 rounded-lg border ${
              importResult.failed > 0 && importResult.success === 0
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm font-semibold text-gray-700">
                Import complete: {importResult.success} rows added successfully
                {importResult.failed > 0 && `, ${importResult.failed} rows skipped`}
              </p>
            </div>
            {importResult.errors.length > 0 && (
              <ul className="text-xs text-gray-500 ml-7 space-y-0.5">
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {importResult.errors.length > 10 && (
                  <li>...and {importResult.errors.length - 10} more</li>
                )}
              </ul>
            )}
          </div>
        )}

        {/* Expected columns info */}
        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-xs font-semibold text-navy-700 mb-2">
            Expected Column Headers
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Your file or pasted data should include these columns (first two are
            required):
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <span
                key={key}
                className={`text-xs px-2 py-1 rounded ${
                  REQUIRED_FIELDS.includes(key)
                    ? "bg-navy-100 text-navy-700 font-semibold"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {label}
                {REQUIRED_FIELDS.includes(key) && " *"}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
