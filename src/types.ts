export interface Standard {
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
  created_at: string;
}

export interface MatchResult {
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

export interface MatchResponse {
  materials: string[];
  results: MatchResult[];
}
