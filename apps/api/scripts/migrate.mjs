// Apply Drizzle migrations using only runtime deps (drizzle-orm + postgres) — no drizzle-kit.
// This is what the container runs (drizzle-kit is a devDependency, absent from the prod image).
// Idempotent: the journal skips already-applied migrations and the custom SQL is itself idempotent.
//   node scripts/migrate.mjs            # uses DATABASE_URL
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice() {} });
try {
  // Provision vanilla Postgres roles, schemas, and helper functions if they don't exist yet
  await sql.unsafe(`
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

    create schema if not exists pgmq;
    create or replace function pgmq.create(queue_name text) returns void language plpgsql as $$ begin null; end $$;
    create or replace function pgmq.send(queue_name text, msg jsonb) returns bigint language plpgsql as $$ begin return 1; end $$;
    grant usage, create on schema pgmq to public;
  `);
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  await sql.unsafe(`
    insert into projects (id, client_id, name)
      values ('00000000-0000-0000-0000-000000000000', 'philosophy-dev-client', 'Philosophy Dev Project')
      on conflict (id) do nothing;
    insert into projects (id, client_id, name)
      values ('11111111-1111-1111-1111-111111111111', 'seed-client', 'Philosophy Seed Project')
      on conflict (id) do nothing;
    insert into entities (id, project_id, short_id, title, content, keywords, metadata, is_draft)
      values 
      ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'spinoza1', 'Hard Determinism vs. Compatibilism: Is Moral Agency an Illusion?', 'If every physical state of the universe is completely determined by prior physical causes and the laws of physics, how can moral responsibility exist without invoking radical non-physical agent causation?', array['Determinism', 'Compatibilism', 'Free Will'], '{"postType":"argument","primarySchool":"Rationalism & Monism","keyThinkers":["Spinoza","Kant"]}'::jsonb, false),
      ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'camus1', 'The Myth of Sisyphus: Creating Meaning in an Absurd Universe', 'The absurd is born of this confrontation between the human-need and the unreasonable silence of the world. One must imagine Sisyphus happy.', array['Absurdism', 'Meaning', 'Sisyphus'], '{"postType":"thought_experiment","primarySchool":"Absurdism","keyThinkers":["Albert Camus","Søren Kierkegaard"]}'::jsonb, false),
      ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'sartre1', 'Existence Precedes Essence: Radical Freedom & Bad Faith', 'Man first of all exists, encounters himself, surges up in the world – and defines himself afterwards. If man as the existentialist sees him is not definable, it is because to begin with he is nothing.', array['Existentialism', 'Freedom', 'Bad Faith'], '{"postType":"thesis","primarySchool":"Existentialism","keyThinkers":["Jean-Paul Sartre","Simone de Beauvoir"]}'::jsonb, false)
      on conflict (id) do nothing;
  `);
  console.log("✓ migrations applied & default projects and entities provisioned");
} finally {
  await sql.end();
}
process.exit(0);
