import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StandardRow {
  id: string;
  standard_number: string;
  title: string;
  category: string | null;
  product_type: string | null;
  keywords: string[];
  scope_summary: string | null;
  source_link: string | null;
  revision_year: number | null;
  status: string;
}

interface MatchResult {
  material: string;
  standard_number: string | null;
  title: string | null;
  category: string | null;
  product_type: string | null;
  scope_summary: string | null;
  source_link: string | null;
  revision_year: number | null;
  status: string | null;
  matched: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const debug: Record<string, string> = {};
    debug.queryLength = String(query.length);

    // Load ALL standards from the database (we need them for keyword-based extraction)
    const { data: allStandards, error: loadError } = await supabase
      .from("standards")
      .select("*")
      .order("standard_number");

    if (loadError) {
      console.error("[match-standards] Failed to load standards:", loadError.message);
      return new Response(
        JSON.stringify({ error: `Database error: ${loadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    debug.standardsInDb = String(allStandards?.length ?? 0);
    console.log(`[match-standards] Loaded ${allStandards?.length ?? 0} standards from DB`);

    // Step 1: Try AI extraction if key exists, otherwise use smart built-in extraction
    const aiApiKey = Deno.env.get("AI_API_KEY");
    const keyExists = !!aiApiKey && aiApiKey.trim().length > 0;
    debug.aiKeyPresent = String(keyExists);

    let extractedMaterials: string[] = [];
    let extractionMethod = "none";
    let extractionError: string | null = null;

    if (keyExists) {
      console.log("[match-standards] AI API key found, trying OpenAI...");
      const result = await extractMaterialsWithAI(query, aiApiKey!);
      if (result.error) {
        console.error("[match-standards] AI failed, falling back to built-in:", result.error);
        extractionError = result.error;
        debug.aiError = result.error;
        extractedMaterials = smartExtractMaterials(query, allStandards || []);
        extractionMethod = "builtin_after_ai_error";
      } else {
        extractedMaterials = result.materials;
        extractionMethod = "ai";
        console.log("[match-standards] AI extracted:", extractedMaterials);
      }
    } else {
      console.log("[match-standards] No AI key, using built-in extraction");
      extractedMaterials = smartExtractMaterials(query, allStandards || []);
      extractionMethod = "builtin";
    }

    debug.extractionMethod = extractionMethod;
    debug.materialsExtracted = String(extractedMaterials.length);
    debug.materials = JSON.stringify(extractedMaterials);

    // Step 2: Match each extracted material against the standards database
    const results: MatchResult[] = [];
    for (const material of extractedMaterials) {
      const match = matchAgainstStandards(material, allStandards || []);
      results.push({
        material,
        standard_number: match?.standard_number ?? null,
        title: match?.title ?? null,
        category: match?.category ?? null,
        product_type: match?.product_type ?? null,
        scope_summary: match?.scope_summary ?? null,
        source_link: match?.source_link ?? null,
        revision_year: match?.revision_year ?? null,
        status: match?.status ?? null,
        matched: !!match,
      });
    }

    debug.matchedCount = String(results.filter((r) => r.matched).length);
    debug.unmatchedCount = String(results.filter((r) => !r.matched).length);

    console.log(`[match-standards] Results: ${results.length} materials, ${results.filter(r => r.matched).length} matched`);

    return new Response(
      JSON.stringify({ materials: extractedMaterials, results, debug, extractionError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[match-standards] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── AI Extraction (optional, only if key is configured) ───

async function extractMaterialsWithAI(
  query: string,
  apiKey: string
): Promise<{ materials: string[]; error: string | null }> {
  try {
    console.log("[match-standards] Calling OpenAI gpt-4o-mini...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a procurement assistant for Indian government procurement. Extract individual materials, components, and products mentioned in the procurement text. Return ONLY a valid JSON array of strings, each being a material/item name. Be specific but concise (e.g. \"TMT bars\", \"Portland cement\", \"structural steel\", \"PVC cables\", \"LPG cylinders\"). Do not include quantities, specifications, or grades — just the material/product names. Output format: [\"item1\", \"item2\", ...]",
          },
          { role: "user", content: query },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    console.log("[match-standards] OpenAI response:", response.status, response.statusText);

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        materials: [],
        error: `OpenAI ${response.status}: ${errorBody.substring(0, 300)}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { materials: [], error: "OpenAI returned empty response" };
    }

    let materials: string[];
    try {
      materials = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return { materials: [], error: `No JSON array in AI response: "${content.substring(0, 200)}"` };
      }
      materials = JSON.parse(jsonMatch[0]);
    }

    if (!Array.isArray(materials)) {
      return { materials: [], error: "AI response is not an array" };
    }

    const cleaned = materials
      .filter((m: unknown): m is string => typeof m === "string")
      .map((m: string) => m.trim())
      .filter((m: string) => m.length > 0);

    return { materials: cleaned, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { materials: [], error: `AI request failed: ${msg}` };
  }
}

// ─── Built-in Smart Extraction (no AI needed) ───

function smartExtractMaterials(query: string, standards: StandardRow[]): string[] {
  const queryLower = query.toLowerCase();
  const foundMaterials: string[] = [];
  const matchedSpans: [number, number][] = [];

  // Build a dictionary of all known keywords and product_types from the database
  // Sort by length descending so longer matches take priority (e.g. "TMT bars" before "TMT")
  const dictionary: { term: string; label: string }[] = [];

  for (const s of standards) {
    if (s.product_type) {
      dictionary.push({ term: s.product_type.toLowerCase(), label: s.product_type });
    }
    for (const kw of s.keywords || []) {
      if (kw.length >= 3) {
        dictionary.push({ term: kw.toLowerCase(), label: kw });
      }
    }
  }

  // Deduplicate by term (keep first label)
  const seen = new Set<string>();
  const uniqueDict = dictionary.filter((d) => {
    const key = d.term;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by term length descending — longer phrases first
  uniqueDict.sort((a, b) => b.term.length - a.term.length);

  console.log(`[match-standards] Dictionary has ${uniqueDict.length} terms`);

  // Scan the query text for each dictionary term
  for (const { term, label } of uniqueDict) {
    // Use word-boundary matching for shorter terms to avoid false positives
    // For longer terms (3+ words or 10+ chars), allow substring matching
    const isLongPhrase = term.split(/\s+/).length >= 2 || term.length >= 10;

    let searchFrom = 0;
    while (searchFrom < queryLower.length) {
      const idx = queryLower.indexOf(term, searchFrom);
      if (idx === -1) break;

      // Check word boundaries for shorter terms
      if (!isLongPhrase) {
        const before = idx > 0 ? queryLower[idx - 1] : " ";
        const after = idx + term.length < queryLower.length ? queryLower[idx + term.length] : " ";
        if (!/[\s,;.:\-\/()]/.test(before) || !/[\s,;.:\-\/()]/.test(after)) {
          searchFrom = idx + 1;
          continue;
        }
      }

      // Check this span doesn't overlap with an already-found match
      const overlaps = matchedSpans.some(([s, e]) => idx < e && idx + term.length > s);
      if (!overlaps) {
        matchedSpans.push([idx, idx + term.length]);
        foundMaterials.push(label);
        console.log(`[match-standards] Found "${label}" at position ${idx}`);
      }

      searchFrom = idx + term.length;
    }
  }

  // Also do phrase-based extraction for materials NOT in the database
  // Split by commas, semicolons, newlines, "and", bullet points
  const phrases = query
    .split(/[,;\n]|\s+and\s+|\s+\d+\.\s+|\s*•\s*/i)
    .map((p) => cleanPhrase(p))
    .filter((p) => p.length >= 3);

  for (const phrase of phrases) {
    // Check if this phrase is already covered by a dictionary match
    const phraseLower = phrase.toLowerCase();
    const alreadyCovered = foundMaterials.some((m) =>
      phraseLower.includes(m.toLowerCase()) || m.toLowerCase().includes(phraseLower)
    );

    if (!alreadyCovered) {
      foundMaterials.push(phrase);
      console.log(`[match-standards] Phrase extraction found: "${phrase}"`);
    }
  }

  // Deduplicate while preserving order
  const deduped: string[] = [];
  const dedupSet = new Set<string>();
  for (const m of foundMaterials) {
    const key = m.toLowerCase();
    if (!dedupSet.has(key)) {
      dedupSet.add(key);
      deduped.push(m);
    }
  }

  return deduped;
}

function cleanPhrase(phrase: string): string {
  return phrase
    .replace(/^\d+\s*(tonnes?|tons?|kg|kgs|bags?|pieces?|units?|sq\.?m|sqm|meters?|metres?|nos?|numbers?|litres?|ltrs?)\s+(of\s+)?/i, "")
    .replace(/^\d+\s+/, "")
    .replace(/^(some|any|the|a|an|approximately|approx|we\s+need|we\s+require|need|require|want|purchase|procure|supply|provide|for)\s+/i, "")
    .replace(/\s+for\s+.*$/i, "")
    .replace(/\s+grade\s+\S+.*$/i, "")
    .replace(/\s+of\s+grade\s+\S+.*$/i, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-•*]\s*/, "");
}

// ─── Matching against standards ───

function matchAgainstStandards(material: string, standards: StandardRow[]): StandardRow | null {
  const searchTerm = material.toLowerCase().trim();
  let bestScore = -1;
  let bestMatch: StandardRow | null = null;

  for (const candidate of standards) {
    let score = 0;
    const productType = (candidate.product_type || "").toLowerCase();
    const title = (candidate.title || "").toLowerCase();
    const keywords = (candidate.keywords || []).map((k: string) => k.toLowerCase());
    const standardNumber = (candidate.standard_number || "").toLowerCase();

    // Exact keyword match
    if (keywords.includes(searchTerm)) {
      score += 100;
    }

    // Partial keyword matches
    for (const kw of keywords) {
      if (searchTerm.includes(kw) || kw.includes(searchTerm)) {
        score += 30;
      }
    }

    // Product type matches
    if (productType && searchTerm.includes(productType)) {
      score += 50;
    }
    if (productType && productType.includes(searchTerm)) {
      score += 40;
    }

    // Word-level matches in title and product type
    for (const word of searchTerm.split(/\s+/)) {
      if (word.length < 3) continue;
      if (title.includes(word)) score += 10;
      if (productType.includes(word)) score += 15;
    }

    // Standard number exact match
    if (standardNumber === searchTerm) {
      score += 200;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}
