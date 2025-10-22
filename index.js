import express from "express";
import "dotenv/config";
import { clerkMiddleware } from "@clerk/express";
import notesRouter from "./routes/notes.js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(clerkMiddleware());

app.use("/api/notes", notesRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
