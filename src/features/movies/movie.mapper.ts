import type { MovieListRow, MovieRow } from './movie.repository';

export interface MovieSummary {
  imdbId: string;
  title: string;
  genres: string[];
  releaseDate: string | null;
  budget: string | null;
}

export interface MovieDetails extends MovieSummary {
  description: string | null;
  runtime: number | null;
  averageRating: number | null;
  originalLanguage: string | null;
  productionCompanies: string[];
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const formatCurrency = (value: number | null): string | null =>
  value == null || value === 0 || Number.isNaN(value) ? null : usd.format(value);

export const parseNames = (json: string | null): string[] => {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (item && typeof item === 'object' && 'name' in item ? (item as { name: unknown }).name : null))
      .filter((name): name is string => typeof name === 'string');
  } catch {
    return [];
  }
};

export const toMovieSummary = (row: MovieListRow): MovieSummary => ({
  imdbId: row.imdbId,
  title: row.title,
  genres: parseNames(row.genres),
  releaseDate: row.releaseDate,
  budget: formatCurrency(row.budget),
});

export const toMovieDetails = (row: MovieRow, averageRating: number | null): MovieDetails => ({
  ...toMovieSummary(row),
  description: row.overview,
  runtime: row.runtime,
  averageRating: averageRating == null ? null : Math.round(averageRating * 100) / 100,
  originalLanguage: row.language,
  productionCompanies: parseNames(row.productionCompanies),
});