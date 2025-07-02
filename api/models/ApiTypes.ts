/**
 * Modelos de respuesta de la API
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string;
  timestamp?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: PaginationInfo;
}

export interface QueryRequest {
  sql: string;
  binds?: any[];
}

export interface ProcedureRequest {
  procedure: string;
  binds?: Record<string, any>;
  type?: "procedure" | "function" | "cursor";
}

export interface TransactionRequest {
  queries: QueryRequest[];
}

export interface TableInfo {
  table_name: string;
  owner: string;
  tablespace_name?: string;
  num_rows?: number;
  blocks?: number;
  avg_row_len?: number;
  last_analyzed?: Date;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  data_length?: number;
  data_precision?: number;
  data_scale?: number;
  nullable: string;
  default_value?: string;
  column_id: number;
}
