import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  server: {
    // Clean URLs: /booking → booking.html, etc.
    rewrites: [
      { source: "/booking", destination: "/booking.html" },
      { source: "/meet-and-greet", destination: "/meet-and-greet.html" },
      { source: "/fan-card", destination: "/fan-card.html" },
      { source: "/report-scam", destination: "/report-scam.html" },
      { source: "/j", destination: "/j.html" },
    ],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        booking: resolve(__dirname, "booking.html"),
        "meet-and-greet": resolve(__dirname, "meet-and-greet.html"),
        "fan-card": resolve(__dirname, "fan-card.html"),
        "report-scam": resolve(__dirname, "report-scam.html"),
        j: resolve(__dirname, "j.html"),
      },
    },
  },
});
