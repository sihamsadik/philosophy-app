// Apply Drizzle migrations and seed real default data into PostgreSQL.
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../drizzle");

const sql = postgres(url, { max: 1, prepare: false, onnotice() {} });
try {
  // Provision vanilla Postgres roles, schemas, and helper functions if they don't exist yet
  await sql.unsafe(`
    /* 
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin noinherit;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin noinherit;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin noinherit;
      end if;
    end $$;
    create schema if not exists auth;
    create schema if not exists private;
    create schema if not exists extensions;
    create or replace function auth.uid() returns uuid
      language sql stable
      as $$
        select coalesce(
          nullif(current_setting('request.jwt.claim.sub', true), ''),
          (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
        )::uuid
      $$;
    grant usage on schema auth to public;
    grant usage on schema private to public;
    grant usage on schema extensions to public;
    grant execute on function auth.uid() to public;
    */

    create schema if not exists pgmq;
    create or replace function pgmq.create(queue_name text) returns void language plpgsql as $$ begin null; end $$;
    create or replace function pgmq.send(queue_name text, msg jsonb) returns bigint language plpgsql as $$ begin return 1; end $$;
    grant usage, create on schema pgmq to public;
  `);

  await migrate(drizzle(sql), { migrationsFolder });

  await sql.unsafe(`
    -- Seed Projects
    insert into projects (id, client_id, name)
      values 
      ('00000000-0000-0000-0000-000000000000', 'philosophy-dev-client', 'Philosophy Dev Project'),
      ('11111111-1111-1111-1111-111111111111', 'seed-client', 'Philosophy Seed Project')
      on conflict (id) do nothing;

    

    

    

    

    
  `);

  console.log("✓ migrations applied & database migrated!");
} finally {
  await sql.end();
}
process.exit(0);
