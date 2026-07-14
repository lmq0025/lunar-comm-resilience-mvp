import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const frontendPort = Number(process.env.LUNAR_FRONTEND_PORT || "5173");

const server = await createServer({
  configFile: false,
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: frontendPort
  }
});

await server.listen();
server.printUrls();
