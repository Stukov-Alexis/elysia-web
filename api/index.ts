import { app } from "../src/index.js";

export default function handler(request: Request) {
  return app.handle(request);
}