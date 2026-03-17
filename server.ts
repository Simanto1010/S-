import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // WebSocket Server for Local Agent
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map<string, WebSocket>();

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
    if (pathname === '/ws/bridge') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    const clientId = uuidv4();
    clients.set(clientId, ws);
    console.log(`Local Agent connected: ${clientId}`);

    ws.on('message', (data) => {
      console.log(`Received from agent ${clientId}:`, data.toString());
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`Local Agent disconnected: ${clientId}`);
    });

    ws.send(JSON.stringify({ type: 'welcome', clientId }));
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", connectedAgents: clients.size });
  });

  // Execute command on local agent
  app.post("/api/bridge/execute", (req, res) => {
    const { command } = req.body;
    if (clients.size === 0) {
      return res.status(404).json({ status: "error", message: "No local agents connected" });
    }
    
    // Broadcast to all agents for demo purposes
    clients.forEach((ws) => {
      ws.send(JSON.stringify({ type: 'command', command }));
    });
    
    res.json({ status: "success", message: "Command sent to local agent" });
  });

  // Memory System: Store command history
  let executionHistory: any[] = [
    { id: '1', command: 'Analyze YouTube performance', timestamp: new Date(Date.now() - 3600000), status: 'success' },
    { id: '2', command: 'Post to LinkedIn', timestamp: new Date(Date.now() - 7200000), status: 'success' },
  ];

  app.get("/api/history", (req, res) => {
    res.json(executionHistory);
  });
  
  // Identity Vault Storage
  let vaultItems = [
    { id: '1', name: 'Google Cloud Console', service: 'Google', status: 'secured', lastUsed: '2h ago' },
    { id: '2', name: 'Stripe Production', service: 'Stripe', status: 'secured', lastUsed: '5h ago' },
  ];

  app.get("/api/vault", (req, res) => {
    res.json(vaultItems);
  });

  app.post("/api/vault", (req, res) => {
    const newItem = { ...req.body, id: uuidv4(), status: 'secured', lastUsed: 'Just now' };
    vaultItems.push(newItem);
    res.json(newItem);
  });

  app.delete("/api/vault/:id", (req, res) => {
    vaultItems = vaultItems.filter(item => item.id !== req.params.id);
    res.json({ status: "success" });
  });

  // Marketplace: Dynamic Connector Framework
  let connectors = [
    { id: 'yt', name: 'YouTube', category: 'Video', status: 'connected', actions: ['Upload', 'Comment', 'Analyze'] },
    { id: 'ig', name: 'Instagram', category: 'Social', status: 'connected', actions: ['Post', 'Story', 'Caption'] },
    { id: 'fb', name: 'Facebook', category: 'Social', status: 'connected', actions: ['Post', 'Group Post'] },
    { id: 'tw', name: 'Twitter', category: 'Social', status: 'connected', actions: ['Tweet', 'Thread'] },
    { id: 'li', name: 'LinkedIn', category: 'Professional', status: 'connected', actions: ['Post', 'Message'] },
    { id: 'no', name: 'Notion', category: 'Productivity', status: 'disconnected', actions: ['Create Page', 'Append'] },
    { id: 'gd', name: 'Google Drive', category: 'Storage', status: 'connected', actions: ['Upload', 'Search'] },
    { id: 'db', name: 'Dropbox', category: 'Storage', status: 'disconnected', actions: ['Sync', 'Share'] },
    { id: 'sl', name: 'Slack', category: 'Messaging', status: 'disconnected', actions: ['Send Message'] },
    { id: 'gh', name: 'GitHub', category: 'Developer', status: 'connected', actions: ['Commit', 'Issue'] },
    { id: 'st', name: 'Stripe', category: 'Finance', status: 'connected', actions: ['Charge', 'Refund'] },
    { id: 'sh', name: 'Shopify', category: 'E-commerce', status: 'disconnected', actions: ['Order Sync', 'Update Stock'] },
  ];

  app.get("/api/connectors", (req, res) => {
    res.json(connectors);
  });

  app.post("/api/connectors/:id/toggle", (req, res) => {
    const { id } = req.params;
    connectors = connectors.map(c => 
      c.id === id ? { ...c, status: c.status === 'connected' ? 'disconnected' : 'connected' } : c
    );
    res.json(connectors.find(c => c.id === id));
  });

  // System Metrics
  app.get("/api/metrics", (req, res) => {
    res.json({
      successRate: 98.4,
      avgLatency: 242,
      activeConnectors: connectors.filter(c => c.status === 'connected').length,
      systemLoad: 14,
      uptime: process.uptime(),
      health: [
        { id: 'ai', name: 'Gemini AI Engine', status: 'online', latency: '142ms', load: '12%' },
        { id: 'connector', name: 'Connector Framework', status: 'online', latency: '45ms', load: '8%' },
        { id: 'bridge', name: 'S+ Local Bridge', status: clients.size > 0 ? 'online' : 'offline', latency: '12ms', load: '2%' },
        { id: 'vault', name: 'Identity Vault', status: 'online', latency: '5ms', load: '1%' },
      ]
    });
  });

  // Settings Persistence
  let userSettings = {
    displayName: 'Admin User',
    email: 'mbidhan474@gmail.com',
    aiModel: 'gemini',
    voiceEnabled: true,
    voiceOutput: 'nova',
    notifications: { push: true, email: false, tasks: true, security: true },
    automationMode: 'autonomous',
    retryStrategy: 'Exponential Backoff (Recommended)'
  };

  app.get("/api/settings", (req, res) => {
    res.json(userSettings);
  });

  app.post("/api/settings", (req, res) => {
    userSettings = { ...userSettings, ...req.body };
    res.json({ status: "success", settings: userSettings });
  });

  // Automation Workflows
  let workflows = [
    { id: '1', name: 'Social Sync', nodes: [
      { id: '1', type: 'trigger', label: 'When a new video is uploaded', platform: 'YouTube' },
      { id: '2', type: 'action', label: 'Generate Summary', platform: 'Gemini' },
      { id: '3', type: 'action', label: 'Post to LinkedIn', platform: 'LinkedIn' },
    ]}
  ];

  app.get("/api/workflows", (req, res) => {
    res.json(workflows);
  });

  app.post("/api/workflows", (req, res) => {
    const newWorkflow = { ...req.body, id: uuidv4() };
    workflows.push(newWorkflow);
    res.json(newWorkflow);
  });

  app.delete("/api/workflows/:id", (req, res) => {
    workflows = workflows.filter(w => w.id !== req.params.id);
    res.json({ status: "success" });
  });

  // Self-Healing Execution Engine
  app.post("/api/execute", (req, res) => {
    const { command, platform, attempt = 1 } = req.body;
    
    // Simulate random failure for self-healing demo
    const shouldFail = Math.random() > 0.8 && attempt === 1;
    
    if (shouldFail) {
      return res.status(500).json({ 
        status: "error", 
        errorType: "API_TIMEOUT",
        message: `Connection to ${platform} failed. Attempting self-healing recovery...`,
        recoveryAction: "SWITCH_ENDPOINT"
      });
    }

    const results: Record<string, any> = {
      YouTube: { url: "https://youtube.com/watch?v=example", thumbnail: "https://picsum.photos/seed/yt/400/225" },
      Instagram: { url: "https://instagram.com/p/example", caption: "Check out my new post!" },
      Notion: { url: "https://notion.so/page-id", summary: "Summary of AI trends..." },
      LinkedIn: { url: "https://linkedin.com/posts/example", status: "Posted successfully" }
    };

    const result = results[platform] || { message: "Action completed" };
    
    // Save to memory
    const historyItem = {
      id: uuidv4(),
      command,
      platform,
      timestamp: new Date(),
      status: 'success',
      attempt
    };
    executionHistory.unshift(historyItem);
    if (executionHistory.length > 20) executionHistory.pop();

    res.json({ 
      status: "success", 
      message: `Task executed on ${platform}${attempt > 1 ? ' (Recovered)' : ''}`,
      result,
      logs: [
        `Analyzing command: ${command}`, 
        `Selecting platform: ${platform}`, 
        attempt > 1 ? `Self-healing: Successfully recovered via ${attempt === 2 ? 'Fallback API' : 'Browser Automation'}` : `Executing via S+ Bridge...`
      ]
    });
  });

  // Serve bridge.py as a static file
  app.get("/bridge.py", (req, res) => {
    const appUrl = process.env.APP_URL || `http://localhost:3000`;
    const wsUrl = appUrl.replace('http', 'ws') + '/ws/bridge';
    
    const bridgeCode = `
import time
import json
import websocket
import pyautogui
import threading

# S+ Local Agent Bridge (WebSocket Version)
# This script allows the S+ Cloud Dashboard to control your local computer.

WS_URL = "${wsUrl}"

def on_message(ws, message):
    data = json.loads(message)
    print(f"Received: {data}")
    
    if data['type'] == 'command':
        cmd = data['command']
        print(f"Executing: {cmd}")
        if "open" in cmd:
            pyautogui.press('win')
            time.sleep(1)
            pyautogui.write(cmd.split("open ")[1])
            pyautogui.press('enter')
        elif "type" in cmd:
            pyautogui.write(cmd.split("type ")[1])

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("### closed ###")

def on_open(ws):
    print("S+ Bridge Connection Established")

def main():
    print(f"Connecting to S+ Cloud at {WS_URL}...")
    websocket.enableTrace(True)
    ws = websocket.WebSocketApp(WS_URL,
                              on_open=on_open,
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close)

    ws.run_forever()

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
