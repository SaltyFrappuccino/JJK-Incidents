import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    // Serve static files from public directory
    "/music/*": async (req) => {
      const url = new URL(req.url);
      // Decode URL to handle spaces and special characters
      const decodedPath = decodeURIComponent(url.pathname);
      const filePath = `./public${decodedPath}`;
      console.log(`Serving static file: ${url.pathname} -> ${filePath}`);
      try {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          console.log(`File found: ${filePath}`);
          return new Response(file);
        } else {
          console.log(`File not found: ${filePath}`);
          return new Response("File not found", { status: 404 });
        }
      } catch (error) {
        console.error(`Error serving file ${filePath}:`, error);
        return new Response("Error serving file", { status: 500 });
      }
    },

    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
