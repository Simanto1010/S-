import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Mock endpoint for "Automation Engine"
  app.post("/api/execute", (req, res) => {
    const { command, platform } = req.body;
    console.log(`Executing command: ${command} on ${platform}`);
    res.json({ 
      status: "success", 
      message: `Task executed on ${platform}`,
      logs: [`Analyzing command: ${command}`, `Selecting platform: ${platform}`, `Executing via S+ Bridge...`]
    });
  });

  // Serve bridge.py as a static file
  app.get("/bridge.py", (req, res) => {
    const appUrl = process.env.APP_URL || `http://localhost:3000`;
    const bridgeCode = `
import time
import sys
import pyautogui
import requests

# S+ Local Agent Bridge
# This script allows the S+ Cloud Dashboard to control your local computer.

SERVER_URL = "${appUrl}"
TOKEN = "YOUR_SECURE_TOKEN"

def execute_command(cmd):
    print(f"Executing: {cmd}")
    if "open" in cmd:
        pyautogui.press('win')
        time.sleep(1)
        pyautogui.write(cmd.split("open ")[1])
        pyautogui.press('enter')
    elif "type" in cmd:
        pyautogui.write(cmd.split("type ")[1])

def main():
    print("S+ Bridge Active. Waiting for commands...")
    # In a real app, this would be a WebSocket client
    while True:
        time.sleep(5)
        # try:
        #     r = requests.get(f"{SERVER_URL}/api/bridge/poll?token={TOKEN}")
        #     if r.status_code == 200:
        #         execute_command(r.json()['command'])
        # except:
        #     pass

if __name__ == "__main__":
    main()
`;
    res.setHeader('Content-Type', 'text/x-python');
    res.setHeader('Content-Disposition', 'attachment; filename=bridge.py');
    res.send(bridgeCode);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
