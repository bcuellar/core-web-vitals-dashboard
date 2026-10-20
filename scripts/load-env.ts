// Imported first by CLI scripts so `.env*` files are loaded (same precedence
// as Next.js) before any other module can read process.env.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
