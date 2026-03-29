import path from "path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const result = config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env["DATABASE_URL"]) {
  console.error("DATABASE_URL is not set.");
  console.error("dotenv result:", result);
  console.error(".env path:", path.resolve(process.cwd(), ".env"));
  throw new Error("DATABASE_URL is not set. Check your .env file.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
