import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { router as apiRouter } from "./routes/index.js";

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

app.use("/api", apiRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`MEL Platform backend running on port ${env.port}`);
});

