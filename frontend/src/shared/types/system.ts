export interface SystemHealth {
  status: string;
  database: string;
  redis: string;
  ai_engine: string;
  embedding_index_size: number;
  ws_connections: number;
}
