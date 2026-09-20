// Checks that the local DATABASE_URL can connect to Prisma Postgres.

import "dotenv/config";
import { Client } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Add your Prisma Postgres URL to .env.");
  }

  const url = new URL(connectionString);
  if (url.searchParams.get("sslmode") === "require" && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  const result = await client.query<{ ok: number }>("select 1 as ok");
  await client.end();

  console.log(`Database connection OK: ${result.rows[0].ok}`);
}

main().catch((error) => {
  console.error("Database connection failed:");
  console.error(error);
  process.exit(1);
});
