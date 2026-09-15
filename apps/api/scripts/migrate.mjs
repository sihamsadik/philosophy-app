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

  await migrate(drizzle(sql), { migrationsFolder });

  await sql.unsafe(`
    -- Seed Projects
    insert into projects (id, client_id, name)
      values 
      ('00000000-0000-0000-0000-000000000000', 'philosophy-dev-client', 'Philosophy Dev Project'),
      ('11111111-1111-1111-1111-111111111111', 'seed-client', 'Philosophy Seed Project')
      on conflict (id) do nothing;

    -- Seed Profiles (Thinkers)
    insert into profiles (id, project_id, name, username, avatar, bio, reputation, metadata)
      values
      ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Immanuel Kant', 'kantian_critique', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', 'Author of Critique of Pure Reason. Duty, categorical imperative, and transcendental idealism.', 2450, '{"primarySchools":["Kantian Idealism","Rationalism"],"keyThinkers":["Kant","Rousseau"]}'::jsonb),
      ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Baruch Spinoza', 'spinoza', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 'Rationalist philosopher. Deus sive Natura — God or Nature as one infinite substance.', 2180, '{"primarySchools":["Rationalism & Monism"],"keyThinkers":["Spinoza","Descartes"]}'::jsonb),
      ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Albert Camus', 'camus', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80', 'Author of The Myth of Sisyphus & The Stranger. Embracing the absurd through rebellion and art.', 1540, '{"primarySchools":["Absurdism"],"keyThinkers":["Camus","Nietzsche"]}'::jsonb),
      ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Jean-Paul Sartre', 'sartre', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', 'Existentialist philosopher. Existence precedes essence. We are condemned to be free.', 1890, '{"primarySchools":["Existentialism","Phenomenology"],"keyThinkers":["Sartre","Beauvoir"]}'::jsonb),
      ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'Friedrich Nietzsche', 'nietzsche', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80', 'Perspectivism, Will to Power, and the revaluation of all values.', 1720, '{"primarySchools":["Perspectivism","Existentialism"],"keyThinkers":["Nietzsche","Schopenhauer"]}'::jsonb)
      on conflict (id) do nothing;

    -- Seed Spaces (Circles)
    insert into spaces (id, project_id, short_id, slug, name, description, members_count)
      values
      ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'existentialist-guild', 'existentialist-guild', 'Existentialist Guild', 'Circle dedicated to existentialism, freedom, responsibility, and bad faith.', 1280),
      ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000', 'spinoza-hub', 'spinoza-hub', 'Spinozan Monism Hub', 'Discussions on rationalism, pantheism, and geometric ethics.', 890),
      ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000000', 'absurdist-circle', 'absurdist-circle', 'Absurdist Circle', 'Exploring human rebellion, Sisyphus, and living authentically in an absurd universe.', 640),
      ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000000', 'kantian-forum', 'kantian-forum', 'Kantian Transcendental Forum', 'Debating categorical imperatives, duty, and the Critique of Pure Reason.', 1120)
      on conflict (id) do nothing;

    -- Seed Entities (Debate Posts)
    insert into entities (id, project_id, short_id, user_id, space_id, title, content, keywords, metadata, is_draft)
      values 
      ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'spinoza1', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000102', 'Hard Determinism vs. Compatibilism: Is Moral Agency an Illusion?', 'If every physical state of the universe is completely determined by prior physical causes and the laws of physics, how can moral responsibility exist without invoking radical non-physical agent causation?', array['Determinism', 'Compatibilism', 'Free Will'], '{"postType":"argument","primarySchool":"Rationalism & Monism","keyThinkers":["Spinoza","Kant"],"authorName":"Baruch Spinoza","authorHandle":"spinoza"}'::jsonb, false),
      ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'camus1', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000103', 'The Myth of Sisyphus: Creating Meaning in an Absurd Universe', 'The absurd is born of this confrontation between the human-need and the unreasonable silence of the world. One must imagine Sisyphus happy.', array['Absurdism', 'Meaning', 'Sisyphus'], '{"postType":"thought_experiment","primarySchool":"Absurdism","keyThinkers":["Albert Camus","Søren Kierkegaard"],"authorName":"Albert Camus","authorHandle":"camus"}'::jsonb, false),
      ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'sartre1', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000101', 'Existence Precedes Essence: Radical Freedom & Bad Faith', 'Man first of all exists, encounters himself, surges up in the world – and defines himself afterwards. If man as the existentialist sees him is not definable, it is because to begin with he is nothing.', array['Existentialism', 'Freedom', 'Bad Faith'], '{"postType":"thesis","primarySchool":"Existentialism","keyThinkers":["Jean-Paul Sartre","Simone de Beauvoir"],"authorName":"Jean-Paul Sartre","authorHandle":"sartre"}'::jsonb, false),
      ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'kant1', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000104', 'The Categorical Imperative: Act Only According to Maxims of Universal Law', 'Two things fill the mind with ever new and increasing admiration and awe: the starry heavens above me and the moral law within me. Act so that the maxim of your will could always hold at the same time as a principle of universal legislation.', array['Kantian Ethics', 'Deontology', 'Duty'], '{"postType":"essay","primarySchool":"Rationalism & Kantian Idealism","keyThinkers":["Immanuel Kant"],"authorName":"Immanuel Kant","authorHandle":"kantian_critique"}'::jsonb, false),
      ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'nietzsche1', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000101', 'Beyond Good and Evil: Will to Power & Master-Slave Morality', 'There are no moral phenomena at all, only a moral interpretation of phenomena. He who fights with monsters should look to it that he himself does not become a monster.', array['Perspectivism', 'Will to Power', 'Ethics'], '{"postType":"argument","primarySchool":"Existentialism & Perspectivism","keyThinkers":["Friedrich Nietzsche"],"authorName":"Friedrich Nietzsche","authorHandle":"nietzsche"}'::jsonb, false)
      on conflict (id) do nothing;

    -- Seed Comments
    insert into comments (id, project_id, entity_id, user_id, content, metadata)
      values
      ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'In the Critique of Practical Reason, freedom must be postulated as a necessary condition of the moral law. Without practical freedom, duty becomes meaningless.', '{"authorName":"Immanuel Kant","authorHandle":"kantian_critique"}'::jsonb),
      ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Precisely! Man is condemned to be free because once thrown into the world, he is responsible for everything he does.', '{"authorName":"Jean-Paul Sartre","authorHandle":"sartre"}'::jsonb),
      ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'The rock still rolls down the hill, yet in accepting the struggle without despair, Sisyphus triumphs over absurd fate.', '{"authorName":"Albert Camus","authorHandle":"camus"}'::jsonb)
      on conflict (id) do nothing;

    -- Seed Events
    insert into events (id, project_id, short_id, user_id, space_id, title, description, start_time, end_time, type, status, capacity, metadata)
      values
      ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000000', 'event1', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000104', '🌌 Transcendental Idealism & Kantian Ethics Symposium', 'Keynote analysis on Kantian duty, synthetic a priori judgments, and moral law.', now() - interval '1 hour', now() + interval '2 hours', 'online', 'active', 25, '{"eventType":"symposium","spaceName":"Kantian Transcendental Forum","attendeeCount":18,"userRsvpStatus":"going"}'::jsonb),
      ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000000', 'event2', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000102', '⚔️ Compatibilism vs. Hard Determinism: Live Formal Debate', 'Structured 90-minute formal duel debating whether moral responsibility remains coherent in a fully deterministic physical cosmos.', now() + interval '1 day', now() + interval '1 day 2 hours', 'online', 'active', 50, '{"eventType":"live_debate","spaceName":"Spinozan Monism Hub","attendeeCount":42,"userRsvpStatus":"going"}'::jsonb),
      ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000000', 'event3', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000101', '🏛️ Existential Ethics & The Ethics of Ambiguity Symposium', 'Virtual symposium presenting thesis papers on Simone de Beauvoirs moral framework under radical freedom.', now() + interval '2 days', now() + interval '2 days 3 hours', 'online', 'active', 100, '{"eventType":"symposium","spaceName":"Existentialist Guild","attendeeCount":64,"userRsvpStatus":"maybe"}'::jsonb)
      on conflict (id) do nothing;
  `);

  console.log("✓ migrations applied & database seeded with default thinkers, debates, circles, and events!");
} finally {
  await sql.end();
}
process.exit(0);
