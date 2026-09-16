import "dotenv/config";
import { createApp } from "./server/app.js";
import { config } from "./server/config.js";
import { closeDb } from "./server/db/database.js";

async function main() {
  const app = await createApp({ serveFrontend: true });
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`[nestin] ${config.env} server listening on http://localhost:${config.port}`);
    console.log(`[nestin] API: http://localhost:${config.port}/api/v1/health`);
    if (config.seedDemoData && !config.isProduction) {
      console.log(`[nestin] demo accounts: owner@nestin.com / tenant@nestin.com / staff@nestin.com (password: ${config.demoPassword})`);
    }
  });

  const shutdown = (signal: string) => {
    console.log(`[nestin] ${signal} received, shutting down`);
    server.close(() => {
      closeDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[nestin] failed to start:", err);
  process.exit(1);
});
