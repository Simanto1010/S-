import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import http from "http";
import dotenv from "dotenv";
import { SaaSService } from "./src/services/saasService";
import { AutonomousAgent } from "./src/services/autonomousAgent";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(express.json());

  // Real-time Dashboard & Multi-user Sync
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join_room", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their private room.`);
    });

    socket.on("local_command", (data, callback) => {
      const { userId, command, params } = data;
      // Broadcast to all local agents for this user
      io.to(`agent_${userId}`).emit("execute_command", { command, params });
      
      // For demo, we simulate a response if no agent is connected
      setTimeout(() => {
        callback({ status: "success", result: { message: "Command sent to local agent" } });
      }, 500);
    });

    socket.on("agent_register", (userId) => {
      socket.join(`agent_${userId}`);
      console.log(`Local Agent registered for user: ${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Metrics API
  app.get("/api/metrics", (req, res) => {
    res.json({
      successRate: 99.4 + (Math.random() * 0.5 - 0.25),
      avgLatency: `${Math.floor(140 + Math.random() * 10)}ms`,
      activeConnectors: 1024 + Math.floor(Math.random() * 10),
      taskLoad: `${Math.floor(20 + Math.random() * 10)}%`,
      cpu: Math.floor(10 + Math.random() * 15),
      memory: Math.floor(40 + Math.random() * 10),
      uptime: '14d 2h 12m',
      health: [
        { id: 'ai-core', name: 'AI Core', status: 'healthy', latency: '42ms' },
        { id: 'connectors', name: 'Connectors', status: 'healthy', latency: '12ms' },
        { id: 'memory-db', name: 'Memory DB', status: 'healthy', latency: '5ms' },
        { id: 'local-bridge', name: 'Local Bridge', status: 'warning', latency: '150ms' }
      ]
    });
  });

  // Execution API
  app.post("/api/execute", async (req, res) => {
    const { command, context, userId } = req.body;
    try {
      const result = await AutonomousAgent.processCommand(command, context, userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin OTP API
  const otpStore = new Map<string, { otp: string, expires: number }>();

  app.post("/api/admin/send-otp", (req, res) => {
    const { email } = req.body;
    if (email !== "mbidhan474@gmail.com") {
      return res.status(403).json({ error: "Access Denied" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 }); // 5 min expiry

    console.log(`[ADMIN OTP] OTP for ${email}: ${otp}`);
    
    // In a real app, send email here
    // For now, we simulate success
    res.json({ success: true, message: "OTP sent to your email (check server logs for demo)" });
  });

  app.post("/api/admin/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    const stored = otpStore.get(email);

    if (!stored || stored.expires < Date.now()) {
      return res.status(400).json({ error: "OTP expired or not found" });
    }

    if (stored.otp === otp) {
      otpStore.delete(email);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid OTP" });
    }
  });

  // Serve bridge.py as a static file
  app.get("/bridge.py", (req, res) => {
    const appUrl = process.env.APP_URL || `http://localhost:3000`;
    const wsUrl = appUrl.replace('http', 'ws') + '/ws/bridge';
    
    const bridgeCode = `
import time
import json
import socketio
import pyautogui
import threading

# S+ Local Agent Bridge (Socket.io Version)
# This script allows the S+ Cloud Dashboard to control your local computer.

SERVER_URL = "${appUrl}"
USER_ID = "YOUR_USER_ID" # User must replace this

sio = socketio.Client()

@sio.event
def connect():
    print("S+ Bridge Connection Established")
    sio.emit('agent_register', USER_ID)

@sio.on('execute_command')
def on_command(data):
    cmd = data['command']
    print(f"Executing: {cmd}")
    if "open" in cmd:
        pyautogui.press('win')
        time.sleep(1)
        pyautogui.write(cmd.split("open ")[1])
        pyautogui.press('enter')
    elif "type" in cmd:
        pyautogui.write(cmd.split("type ")[1])

def main():
    print(f"Connecting to S+ Cloud at {SERVER_URL}...")
    sio.connect(SERVER_URL)
    sio.wait()

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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
