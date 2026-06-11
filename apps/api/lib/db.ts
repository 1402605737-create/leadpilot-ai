import pg from "pg";
import { mockLeads, mockReplies } from "@leadpilot/shared";

const { Pool } = pg;
let pool: pg.Pool | undefined;

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, ""),
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000
  });
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}

export async function ensureSchemaAndSeed() {
  await query(`
    create table if not exists leads (
      id text primary key,
      payload jsonb not null,
      created_at timestamptz not null default now()
    );
    create table if not exists replies (
      id text primary key,
      lead_id text not null,
      payload jsonb not null,
      created_at timestamptz not null default now()
    );
    create table if not exists ai_runs (
      id text primary key,
      task text not null,
      lead_id text not null,
      model text not null,
      fallback boolean not null,
      status text not null,
      evidence jsonb not null,
      steps jsonb not null,
      result jsonb not null,
      created_at timestamptz not null default now()
    );
  `);
  for (const lead of mockLeads) {
    await query("insert into leads(id, payload) values($1, $2) on conflict(id) do update set payload=excluded.payload", [lead.id, lead]);
  }
  for (const reply of mockReplies) {
    await query("insert into replies(id, lead_id, payload) values($1, $2, $3) on conflict(id) do update set payload=excluded.payload", [reply.id, reply.leadId, reply]);
  }
}

