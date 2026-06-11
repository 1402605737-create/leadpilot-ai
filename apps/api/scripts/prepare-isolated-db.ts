import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mockLeads, mockReplies } from "@leadpilot/shared";

const APP_SCHEMA = "leadpilot";
const APP_ROLE = "leadpilot_app";
const deployDir = join(tmpdir(), "leadpilot-deploy");
const metadataPath = join(deployDir, "supabase-existing-project.txt");

function sqlJson(value: unknown) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

const metadata = Object.fromEntries(
  (await readFile(metadataPath, "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    })
);

if (!metadata.PROJECT_REF || !metadata.POOLER_HOST) {
  throw new Error("supabase-existing-project.txt must contain PROJECT_REF and POOLER_HOST");
}

const password = randomBytes(36).toString("base64url").replaceAll("-", "A").replaceAll("_", "B");
const leadValues = mockLeads.map((lead) => `(${sqlText(lead.id)}, ${sqlJson(lead)})`).join(",\n");
const replyValues = mockReplies.map((reply) => `(${sqlText(reply.id)}, ${sqlText(reply.leadId)}, ${sqlJson(reply)})`).join(",\n");

const sql = `-- LeadPilot isolated one-time initialization.
-- Scope: role ${APP_ROLE} and schema ${APP_SCHEMA} only.
do $leadpilot$
begin
  if not exists (select 1 from pg_roles where rolname = '${APP_ROLE}') then
    execute format('create role ${APP_ROLE} login password %L nosuperuser nocreatedb nocreaterole noinherit nobypassrls', '${password}');
  else
    execute format('alter role ${APP_ROLE} with login password %L nosuperuser nocreatedb nocreaterole noinherit nobypassrls', '${password}');
  end if;
end
$leadpilot$;

create schema if not exists ${APP_SCHEMA};

create table if not exists ${APP_SCHEMA}.leads (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists ${APP_SCHEMA}.replies (
  id text primary key,
  lead_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists ${APP_SCHEMA}.ai_runs (
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
create index if not exists leadpilot_ai_runs_created_at_idx on ${APP_SCHEMA}.ai_runs(created_at desc);
create index if not exists leadpilot_ai_runs_lead_id_idx on ${APP_SCHEMA}.ai_runs(lead_id);

insert into ${APP_SCHEMA}.leads(id, payload) values
${leadValues}
on conflict(id) do update set payload = excluded.payload;

insert into ${APP_SCHEMA}.replies(id, lead_id, payload) values
${replyValues}
on conflict(id) do update set lead_id = excluded.lead_id, payload = excluded.payload;

grant connect on database postgres to ${APP_ROLE};
grant usage on schema ${APP_SCHEMA} to ${APP_ROLE};
grant select, insert, update, delete on ${APP_SCHEMA}.leads, ${APP_SCHEMA}.replies, ${APP_SCHEMA}.ai_runs to ${APP_ROLE};

alter table ${APP_SCHEMA}.leads enable row level security;
alter table ${APP_SCHEMA}.replies enable row level security;
alter table ${APP_SCHEMA}.ai_runs enable row level security;

drop policy if exists leadpilot_app_access on ${APP_SCHEMA}.leads;
create policy leadpilot_app_access on ${APP_SCHEMA}.leads for all to ${APP_ROLE} using (true) with check (true);
drop policy if exists leadpilot_app_access on ${APP_SCHEMA}.replies;
create policy leadpilot_app_access on ${APP_SCHEMA}.replies for all to ${APP_ROLE} using (true) with check (true);
drop policy if exists leadpilot_app_access on ${APP_SCHEMA}.ai_runs;
create policy leadpilot_app_access on ${APP_SCHEMA}.ai_runs for all to ${APP_ROLE} using (true) with check (true);

select current_database(), current_user;
select (select count(*) from ${APP_SCHEMA}.leads) as leads,
       (select count(*) from ${APP_SCHEMA}.replies) as replies;
`;

const encodedPassword = encodeURIComponent(password);
const connectionString = `postgresql://${APP_ROLE}.${metadata.PROJECT_REF}:${encodedPassword}@${metadata.POOLER_HOST}:6543/postgres`;
await mkdir(deployDir, { recursive: true });
await writeFile(join(deployDir, "leadpilot-init-sql.tmp"), sql, { encoding: "utf8", mode: 0o600 });
await writeFile(join(deployDir, "leadpilot-app-connection.tmp"), connectionString, { encoding: "utf8", mode: 0o600 });
console.log(`Prepared isolated SQL and app connection files in ${deployDir}. No secrets were printed.`);

