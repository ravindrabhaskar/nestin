import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiGatewayRouter } from "./services/api-gateway/index.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON & URL-encoded body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Global CORS Headers
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Correlation-Id, X-Request-Id");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Mount Centralized API Gateway as the single entry point for all frontend requests
  // Supports both /api/v1/* and /api/* paths (e.g. /api/auth/* to Auth Service)
  app.use("/api/v1", apiGatewayRouter);
  app.use("/api", apiGatewayRouter);

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Nestin Microservices Gateway] running on http://0.0.0.0:${PORT}`);
    console.log(`- API Gateway: http://0.0.0.0:${PORT}/api/v1`);
    console.log(`- Gateway Health: http://0.0.0.0:${PORT}/api/v1/health`);
  });
}

startServer();
