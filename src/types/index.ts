export interface ListingSummary {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  city: string;
  state: string;
  seats: number;
  imageUrls: string[];
  avgRating?: number;
}

export interface SearchFilters {
  city?: string;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  seats?: number;
}
