import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { router as apiRouter } from "./routes/index.js";
import { swaggerSpec } from "./config/swagger.js";
import { initSocket } from "./services/socketService.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "https://mel-client-gdjq.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "mel-platform-backend" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", apiRouter);

app.use(errorHandler);

const server = http.createServer(app);

initSocket(server);

server.listen(env.port, () => {
  console.log(`MEL Platform backend running on port ${env.port}`);
  console.log(`WebSocket server ready on port ${env.port}`);
});
