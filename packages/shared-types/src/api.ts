export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown[];
  requestId: string;
  timestamp: string;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
