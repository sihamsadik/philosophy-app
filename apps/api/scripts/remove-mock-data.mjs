import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required in .env");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function run() {
  console.log("Connecting to database at", url.split("@")[1]);
  try {
    console.log("Deleting mock events...");
    await sql`DELETE FROM events WHERE user_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000005'
    )`;

    console.log("Deleting mock comments...");
    await sql`DELETE FROM comments WHERE user_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000005'
    )`;

    console.log("Deleting mock debate posts (entities)...");
    await sql`DELETE FROM entities WHERE user_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000005'
    )`;

    console.log("Deleting mock spaces (circles)...");
    await sql`DELETE FROM spaces WHERE id IN (
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000103',
      '00000000-0000-0000-0000-000000000104'
    )`;

    console.log("Deleting mock thinker profiles (Immanuel Kant, etc.)...");
    await sql`DELETE FROM profiles WHERE id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000005'
    )`;

    console.log("✅ Successfully removed all mock data from the database.");
  } catch (err) {
    console.error("❌ Failed to delete mock data:", err.message);
  } finally {
    await sql.end();
  }
}

run();
