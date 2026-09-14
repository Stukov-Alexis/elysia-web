import { app } from "./app.js";
import { config } from "./config.js";

const server = app.listen(config.port);
console.log(`Booru API is running at http://${server.server?.hostname}:${server.server?.port}`);
