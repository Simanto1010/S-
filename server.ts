import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import http from "http";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import cors from "cors";
import { SaaSService } from "./src/services/saasService";
import { AutonomousAgent } from "./src/services/autonomousAgent";
import { db } from "./src/firebase";
import { 
  collection, addDoc, query, where, getDocs, deleteDoc, 
  doc, getDoc, setDoc, updateDoc 
} from "firebase/firestore";

dotenv.config();

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

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Request logger for debugging API issues
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API DEBUG] ${req.method} ${req.path} - Headers: ${JSON.stringify(req.headers)}`);
    }
    next();
  });

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
  const otpRateLimit = new Map<string, { count: number, lastReset: number }>();

  // AI Security Risk Scoring (Level 5)
  const RISK_WEIGHTS = {
    NEW_DEVICE: 10, // Reduced from 40
    FAILED_OTP: 5,  // Reduced from 15 per attempt
    IP_CHANGE: 30,
    RAPID_LOGIN: 25,
  };

  async function calculateRiskScore(email: string, context: any, db: any, firestore: any) {
    const { collection, query, where, getDocs, orderBy, limit, doc, getDoc } = firestore;
    let score = 0;
    const reasons: string[] = [];

    // 1. Check for new device
    const deviceRef = doc(db, 'adminDevices', context.deviceId || 'unknown');
    const deviceSnap = await getDoc(deviceRef);
    if (!deviceSnap.exists()) {
      score += RISK_WEIGHTS.NEW_DEVICE;
      reasons.push("Login from unrecognized device");
    }

    // 2. Check failed attempts
    const securityRef = doc(db, 'adminSecurity', email);
    const securitySnap = await getDoc(securityRef);
    if (securitySnap.exists()) {
      const data = securitySnap.data();
      if (data.failedAttempts > 0) {
        score += data.failedAttempts * RISK_WEIGHTS.FAILED_OTP;
        reasons.push(`${data.failedAttempts} failed OTP attempts detected`);
      }
    }

    // 3. Check for IP changes
    const logsQuery = query(
      collection(db, 'adminLogs'),
      where('email', '==', email),
      where('actionType', '==', 'login_success'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const lastLogSnap = await getDocs(logsQuery);
    if (!lastLogSnap.empty) {
      const lastLog = lastLogSnap.docs[0].data();
      if (lastLog.ip !== context.ip) {
        score += RISK_WEIGHTS.IP_CHANGE;
        reasons.push(`IP address changed from ${lastLog.ip} to ${context.ip}`);
      }
    }

    // 4. Admin Whitelist (Senior Patch)
    const ADMIN_EMAIL = "mbidhan474@gmail.com";
    if (email === ADMIN_EMAIL) {
      score = Math.max(score - 50, 0);
      console.log(`[ADMIN SECURITY] Admin whitelist applied for ${email}. Reduced score to ${score}`);
    }

    score = Math.min(score, 100);
    let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    
    // HIGH risk threshold increased from 70 to 90
    if (score >= 90) level = 'HIGH';
    else if (score > 40) level = 'MEDIUM';

    console.log(`[ADMIN SECURITY] Risk Assessment for ${email}: Score=${score}, Level=${level}`);
    return { score, level, reasons };
  }

  async function handleThreatResponse(email: string, risk: any, context: any, db: any, firestore: any) {
    const { collection, addDoc, doc, setDoc, updateDoc, query, where, getDocs } = firestore;
    
    // DEV SAFE MODE: Disable auto-block and auto-logout in development
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log(`[ADMIN SECURITY] DEV SAFE MODE: Skipping threat response for ${email}`);
      return false;
    }

    // Log threat (Non-blocking)
    addDoc(collection(db, 'adminThreats'), {
      email,
      riskScore: risk.score,
      riskLevel: risk.level,
      action: risk.level === 'HIGH' ? 'AUTO_LOGOUT_BLOCK' : (risk.level === 'MEDIUM' ? 'WARNING_OTP_REQ' : 'MONITOR'),
      device: context.userAgent,
      ip: context.ip,
      details: risk.reasons.join(', '),
      timestamp: new Date().toISOString()
    }).catch(err => console.error("[ADMIN SECURITY] Failed to log threat:", err));

    // Email Alert (Non-blocking)
    if (risk.level !== 'LOW') {
      (async () => {
        try {
          const nodemailer = await import('nodemailer');
          const smtpPort = Number(process.env.SMTP_PORT) || 465;
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            tls: { rejectUnauthorized: false }
          });

          const subject = risk.level === 'HIGH' ? "⚠️ CRITICAL: High Risk Admin Activity Detected" : "⚠️ WARNING: Suspicious Admin Activity";
          const message = `
            AI Security Monitor detected ${risk.level} risk activity.
            
            Risk Score: ${risk.score}/100
            Level: ${risk.level}
            Reasons: ${risk.reasons.join(', ')}
            
            Device: ${context.userAgent}
            IP: ${context.ip}
            Time: ${new Date().toLocaleString()}
            
            Action Taken: ${risk.level === 'HIGH' ? 'Session terminated and account blocked for 10 minutes.' : 'Warning issued and OTP re-verification required.'}
          `;

          await transporter.sendMail({
            from: `"AI Security Monitor" <${process.env.SMTP_USER}>`,
            to: "mbidhan474@gmail.com",
            subject,
            text: message
          });
        } catch (e) {
          console.error("Failed to send threat alert email:", e);
        }
      })();
    }

    if (risk.level === 'HIGH') {
      // Block for 10 minutes
      const securityRef = doc(db, 'adminSecurity', email);
      const blockPromise = setDoc(securityRef, {
        isBlockedUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        lastRiskScore: risk.score
      }, { merge: true });

      // Invalidate all sessions
      const sessionsQuery = query(collection(db, 'adminSessions'), where('email', '==', email), where('isValid', '==', true));
      const activeSessions = await getDocs(sessionsQuery);
      const invalidatePromises = activeSessions.docs.map(d => updateDoc(doc(db, 'adminSessions', d.id), { isValid: false }));
      
      await Promise.all([blockPromise, ...invalidatePromises]);
      
      return true;
    }

    return false;
  }

  app.post("/api/admin/send-otp", async (req, res) => {
    const email = req.body.email?.trim();
    const ADMIN_EMAIL = "mbidhan474@gmail.com";

    console.log(`[ADMIN OTP] Request received for: "${email}"`);

    if (email !== ADMIN_EMAIL) {
      console.warn(`[ADMIN SECURITY] Unauthorized OTP attempt for: "${email}"`);
      return res.status(403).json({ error: "Access Denied" });
    }

    try {
      // 1. Check persistent block status
      const securityRef = doc(db, 'adminSecurity', email);
      const securitySnap = await getDoc(securityRef);
      const securityData = securitySnap.exists() ? securitySnap.data() : null;

      if (securityData?.isBlockedUntil) {
        const blockedUntil = new Date(securityData.isBlockedUntil);
        if (blockedUntil > new Date()) {
          const waitMinutes = Math.ceil((blockedUntil.getTime() - Date.now()) / 60000);
          console.warn(`[ADMIN OTP] Blocked user ${email} attempted OTP request. Remaining: ${waitMinutes}m`);
          return res.status(429).json({ error: `Too many attempts. Blocked for ${waitMinutes} more minutes.` });
        }
      }

      // 2. Rate limiting: max 5 requests per 5 minutes (In-memory)
      const now = Date.now();
      const limit = otpRateLimit.get(email) || { count: 0, lastReset: now };
      
      if (now - limit.lastReset > 300000) { // 5 minutes
        limit.count = 0;
        limit.lastReset = now;
      }

      if (limit.count >= 5) {
        console.warn(`[ADMIN OTP] Rate limit exceeded for ${email}`);
        return res.status(429).json({ error: "Too many requests. Please wait 5 minutes." });
      }
      
      limit.count++;
      otpRateLimit.set(email, limit);

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      console.log(`[ADMIN OTP] Generated OTP for ${email}: ${otp}`);
      
      // Cleanup old OTPs for this email
      const q = query(collection(db, 'admin_otps'), where('email', '==', email));
      const oldOtps = await getDocs(q);
      const deletePromises = oldOtps.docs.map(d => deleteDoc(doc(db, 'admin_otps', d.id)));
      await Promise.all(deletePromises);

      // Save new OTP
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + 60 * 1000); // 60 seconds expiry

      await addDoc(collection(db, 'admin_otps'), {
        email,
        otp,
        expiresAt: expiresAt.toISOString(),
        createdAt: createdAt.toISOString()
      });

      console.log(`[ADMIN OTP] OTP stored in Firestore for ${email}`);

      // 3. Send email using Nodemailer
      const smtpPort = Number(process.env.SMTP_PORT) || 465;
      
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("[ADMIN OTP] SMTP credentials missing. OTP logged to console only.");
        return res.json({ 
          success: true, 
          message: "OTP generated (Check console for debug mode)",
          debug: process.env.NODE_ENV !== 'production' ? otp : undefined
        });
      }

      console.log(`[ADMIN OTP] Attempting to send email via ${process.env.SMTP_HOST || 'smtp.gmail.com'}:${smtpPort}`);

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.sendMail({
        from: `"S+ System Admin" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Your S+ Admin Verification Code",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
            <h2 style="color: #06b6d4;">S+ System Admin Verification</h2>
            <p>Your 6-digit verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000; margin: 20px 0;">${otp}</div>
            <p style="color: #666; font-size: 14px;">This code is valid for <b>60 seconds</b>.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">If you did not request this code, please ignore this email.</p>
          </div>
        `
      });

      console.log(`[ADMIN OTP] Email sent successfully to ${email}`);
      res.json({ success: true, message: "OTP sent to your email (valid for 60s)" });
    } catch (error: any) {
      console.error("[ADMIN OTP] Failed to process OTP:", error);
      res.status(500).json({ 
        error: "Failed to send verification code.",
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  });

  app.post("/api/admin/verify-otp", async (req, res) => {
    const email = req.body.email?.trim();
    const { otp, deviceInfo } = req.body;
    console.log(`[ADMIN OTP] Received verification request for "${email}". Body keys: ${Object.keys(req.body)}`);
    
    if (!email || !otp) {
      console.warn(`[ADMIN OTP] Missing email or otp in request body:`, req.body);
      return res.status(400).json({ error: "Email and code are required" });
    }

    const ADMIN_EMAIL = "mbidhan474@gmail.com";
    if (email !== ADMIN_EMAIL) {
      console.warn(`[ADMIN SECURITY] Unauthorized verify attempt for: "${email}"`);
      return res.status(403).json({ error: "Access Denied" });
    }
    
    // 5-second timeout safety
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 5000)
    );

    try {
      console.log(`[ADMIN OTP] Starting verification race for ${email}`);
      await Promise.race([
        (async () => {
          const { db } = await import("./src/firebase");
          const { collection, query, where, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc, addDoc, orderBy, limit } = await import("firebase/firestore");

          console.log(`[ADMIN OTP] Fetching security data for ${email}`);
          const securityRef = doc(db, 'adminSecurity', email);
          const securitySnap = await getDoc(securityRef);
          const securityData = securitySnap.exists() ? securitySnap.data() : { failedAttempts: 0 };

          // 1. Check if currently blocked
          if (securityData.isBlockedUntil) {
            const blockedUntil = new Date(securityData.isBlockedUntil);
            if (blockedUntil > new Date()) {
              console.warn(`[ADMIN OTP] Account ${email} is currently blocked until ${securityData.isBlockedUntil}`);
              return res.status(429).json({ error: "Too many attempts. Try again later." });
            }
          }

          // 2. Fetch LATEST OTP for this email
          console.log(`[ADMIN OTP] Fetching latest OTP for ${email}`);
          const q = query(
            collection(db, 'admin_otps'), 
            where('email', '==', email),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            console.warn(`[ADMIN OTP] No OTP found for ${email}`);
            return res.status(400).json({ error: "No verification code found. Please request a new one." });
          }

          const otpDoc = snapshot.docs[0];
          const otpData = otpDoc.data();
          const now = new Date();
          const createdAt = new Date(otpData.createdAt);
          const expiresAt = new Date(otpData.expiresAt);
          
          // TEMPORARY DEBUG LOGGING
          console.log(`[ADMIN OTP] DEBUG for ${email}:
            Stored OTP: ${otpData.otp}
            Entered OTP: ${otp}
            Created At: ${otpData.createdAt}
            Expires At: ${otpData.expiresAt}
            Current Server Time: ${now.toISOString()}
            Is Expired: ${now > expiresAt}
          `);

          // 3. Validate OTP and Expiry
          if (otpData.otp !== otp) {
            console.warn(`[ADMIN OTP] Invalid OTP entered for ${email}: ${otp}`);
            // Failed attempt logic...
            const newFailedAttempts = (securityData.failedAttempts || 0) + 1;
            const updateData: any = {
              email,
              failedAttempts: newFailedAttempts,
              lastAttemptTime: now.toISOString()
            };

            if (newFailedAttempts >= 5) {
              updateData.isBlockedUntil = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
            }

            // Non-blocking security update and logging
            setDoc(securityRef, updateData, { merge: true }).catch(err => console.error("[ADMIN OTP] Failed to update security state:", err));
            
            addDoc(collection(db, 'adminLogs'), {
              email,
              actionType: 'login_failure',
              status: 'failed',
              details: `Invalid OTP entered: ${otp}. Total failures: ${newFailedAttempts}`,
              device: deviceInfo?.userAgent || 'Unknown',
              ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
              timestamp: now.toISOString()
            }).catch(err => console.error("[ADMIN OTP] Failed to log failure:", err));

            return res.status(400).json({ 
              error: `Invalid code. ${5 - newFailedAttempts} attempts remaining.` 
            });
          }

          if (now > expiresAt) {
            console.warn(`[ADMIN OTP] OTP expired for ${email}`);
            deleteDoc(doc(db, 'admin_otps', otpDoc.id)).catch(err => console.error("[ADMIN OTP] Failed to delete expired OTP:", err));
            return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
          }

          // Success: Level 3 Intelligent Control
          console.log(`[ADMIN OTP] OTP valid for ${email}. Proceeding with success logic.`);
          const deviceId = deviceInfo?.deviceId || 'unknown_device';
          const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
          
          // AI Risk Assessment (Level 5)
          const risk = await calculateRiskScore(email, { deviceId, ip, userAgent: deviceInfo?.userAgent }, db, { collection, query, where, getDocs, orderBy, limit, doc, getDoc });
          
          // BYPASS AI BLOCK AFTER SUCCESS: If OTP is correct, we allow login but still log the risk
          const isDev = process.env.NODE_ENV !== 'production';
          let wasTerminated = false;
          
          // DO NOT trigger block if OTP is correct (Senior Patch)
          console.log(`[ADMIN OTP] OTP verified for ${email}. Bypassing all risk-based blocking.`);
          wasTerminated = false; 
          
          if (!isDev) {
            // Still log the threat if risk is high, but don't block
            if (risk.level === 'HIGH' || risk.level === 'MEDIUM') {
               // Non-blocking threat handling
               handleThreatResponse(email, risk, { userAgent: deviceInfo?.userAgent, ip }, db, { collection, addDoc, doc, setDoc, updateDoc, query, where, getDocs })
                 .catch(err => console.error("[ADMIN OTP] Failed to handle threat response:", err));
            }
          } else {
            console.log(`[ADMIN OTP] DEV MODE: Skipping risk assessment blocking for ${email}`);
          }

          if (wasTerminated) {
            console.warn(`[ADMIN OTP] OTP success but blocked reason: High risk activity detected for ${email}. Risk Score: ${risk.score}`);
            return res.status(403).json({ error: "High risk activity detected. Session blocked for security." });
          }

          const deviceRef = doc(db, 'adminDevices', deviceId);
          const deviceSnap = await getDoc(deviceRef);
          const isNewDevice = !deviceSnap.exists();

          // Track Device (Non-blocking)
          setDoc(deviceRef, {
            email,
            deviceId,
            userAgent: deviceInfo?.userAgent,
            platform: deviceInfo?.platform,
            lastUsed: now.toISOString(),
            isTrusted: true
          }, { merge: true }).catch(err => console.error("[ADMIN OTP] Failed to track device:", err));

          // Single Session Management
          const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
          
          // Invalidate old sessions (Non-blocking)
          if (securityData.activeSessionId) {
            const oldSessionRef = doc(db, 'adminSessions', securityData.activeSessionId);
            updateDoc(oldSessionRef, { isValid: false }).catch(err => console.warn("[ADMIN OTP] Failed to invalidate old session:", err));
          }

          // Create new session
          const sessionPromise = setDoc(doc(db, 'adminSessions', sessionId), {
            email,
            sessionId,
            deviceId,
            createdAt: now.toISOString(),
            lastSeen: now.toISOString(),
            isValid: true
          });

          // Update security state
          const securityPromise = setDoc(securityRef, {
            email,
            failedAttempts: 0,
            isBlockedUntil: null,
            lastLoginTime: now.toISOString(),
            activeSessionId: sessionId
          }, { merge: true });

          // Cleanup used OTP
          const cleanupPromise = deleteDoc(doc(db, 'admin_otps', otpDoc.id));
          
          // Log Success
          const logPromise = addDoc(collection(db, 'adminLogs'), {
            email,
            actionType: 'login_success',
            status: 'success',
            details: `Successful login from ${isNewDevice ? 'new' : 'recognized'} device`,
            device: deviceInfo?.userAgent || 'Unknown',
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            timestamp: now.toISOString()
          });

          await Promise.all([sessionPromise, securityPromise, cleanupPromise, logPromise]);

          // Send Login Alert Email (Enhanced for Level 3)
          // We don't await this to keep response fast
          (async () => {
            try {
              const nodemailer = await import('nodemailer');
              const smtpPort = Number(process.env.SMTP_PORT) || 465;
              const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: smtpPort,
                secure: smtpPort === 465,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                tls: { rejectUnauthorized: false }
              });

              if (process.env.SMTP_USER && process.env.SMTP_PASS) {
                const alertType = isNewDevice ? "NEW DEVICE LOGIN" : "Admin Login";
                const alertColor = isNewDevice ? "#e11d48" : "#06b6d4";

                await transporter.sendMail({
                  from: `"S+ Security Alert" <${process.env.SMTP_USER}>`,
                  to: email,
                  subject: `S+ Security Alert: ${alertType}`,
                  html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
                      <h2 style="color: ${alertColor};">${alertType}</h2>
                      <p>A successful admin login was detected for your account.</p>
                      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><b>Time:</b> ${new Date().toLocaleString()}</p>
                        <p style="margin: 5px 0;"><b>Device:</b> ${deviceInfo?.userAgent || 'Unknown'}</p>
                        <p style="margin: 5px 0;"><b>Platform:</b> ${deviceInfo?.platform || 'Unknown'}</p>
                        <p style="margin: 5px 0;"><b>Status:</b> ${isNewDevice ? 'New Device Detected' : 'Recognized Device'}</p>
                        <p style="margin: 5px 0;"><b>IP:</b> ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}</p>
                      </div>
                      <p style="font-size: 14px; color: #666;">If this wasn't you, please secure your account immediately.</p>
                    </div>
                  `
                });
              }
            } catch (emailErr) {
              console.error("[ADMIN SECURITY] Failed to send login alert:", emailErr);
            }
          })();

          console.log(`[ADMIN OTP] Successful verification for ${email}. Session: ${sessionId}`);
          
          // Ensure we return success response even if background tasks (like email) are slow
          return res.status(200).json({ 
            success: true, 
            message: "OTP verified", 
            sessionId: sessionId 
          });
        })(),
        timeoutPromise
      ]);
    } catch (error: any) {
      if (error.message === 'TIMEOUT') {
        console.error("[ADMIN OTP] Verification timed out on server for", email);
        return res.status(504).json({ error: "Verification timed out. Please try again." });
      }
      console.error("[ADMIN OTP] Verification error for", email, ":", error);
      return res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/admin/logout-all", async (req, res) => {
    const { email } = req.body;
    try {
      const { db } = await import("./src/firebase");
      const { collection, query, where, getDocs, updateDoc, doc, addDoc } = await import("firebase/firestore");

      const q = query(collection(db, 'adminSessions'), where('email', '==', email), where('isValid', '==', true));
      const snapshot = await getDocs(q);
      
      const promises = snapshot.docs.map(d => updateDoc(doc(db, 'adminSessions', d.id), { isValid: false }));
      await Promise.all(promises);

      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        email,
        actionType: 'logout_all_devices',
        status: 'success',
        details: `Invalidated ${snapshot.size} active sessions`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, count: snapshot.size });
    } catch (error) {
      res.status(500).json({ error: "Failed to logout all devices" });
    }
  });

  app.post("/api/admin/reset-security", async (req, res) => {
    const { email } = req.body;
    try {
      const { db } = await import("./src/firebase");
      const { doc, setDoc, addDoc, collection } = await import("firebase/firestore");

      await setDoc(doc(db, 'adminSecurity', email), {
        email,
        failedAttempts: 0,
        isBlockedUntil: null,
        lastAttemptTime: null
      }, { merge: true });

      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        email,
        actionType: 'security_reset',
        status: 'success',
        details: 'Security state reset manually',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset security" });
    }
  });

  app.delete("/api/admin/devices/:deviceId", async (req, res) => {
    const { deviceId } = req.params;
    const { email } = req.body;
    try {
      const { db } = await import("./src/firebase");
      const { doc, deleteDoc, addDoc, collection } = await import("firebase/firestore");

      await deleteDoc(doc(db, 'adminDevices', deviceId));

      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        email,
        actionType: 'remove_device',
        status: 'success',
        details: `Removed trusted device: ${deviceId}`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove device" });
    }
  });

  app.get("/api/admin/threats", async (req, res) => {
    const { email } = req.query;
    try {
      const { db } = await import("./src/firebase");
      const { collection, query, where, getDocs, orderBy, limit } = await import("firebase/firestore");

      const q = query(
        collection(db, 'adminThreats'),
        where('email', '==', email),
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const threats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      res.json({ threats });
    } catch (error) {
      console.error("Failed to fetch threats:", error);
      res.status(500).json({ error: "Failed to fetch threats" });
    }
  });

  app.post("/api/admin/log-action", async (req, res) => {
    const { email, actionType, details, status, deviceInfo } = req.body;
    try {
      const { db } = await import("./src/firebase");
      const { collection, addDoc } = await import("firebase/firestore");

      await addDoc(collection(db, 'adminLogs'), {
        email,
        actionType,
        status: status || 'success',
        details: details || '',
        device: deviceInfo?.userAgent || 'Unknown',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to log action" });
    }
  });

  app.post("/api/admin/validate-session", async (req, res) => {
    const { sessionId, email } = req.body;
    try {
      const { db } = await import("./src/firebase");
      const { doc, getDoc, updateDoc } = await import("firebase/firestore");

      const sessionRef = doc(db, 'adminSessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists() || !sessionSnap.data().isValid || sessionSnap.data().email !== email) {
        return res.status(401).json({ error: "Session invalid or expired" });
      }

      // Update last seen
      await updateDoc(sessionRef, { lastSeen: new Date().toISOString() });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Session validation failed" });
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

  // API 404 handler - prevent falling through to SPA fallback
  app.all('/api/*', (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.path}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
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

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[GLOBAL ERROR]", err);
    if (res.headersSent) {
      return next(err);
    }
    if (req.path.startsWith('/api')) {
      return res.status(500).json({ 
        error: "Internal Server Error", 
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
    next(err);
  });

  // 5. Subscription Expiry System (Daily Check)
  async function runSubscriptionExpiryCheck() {
    console.log("[SUBSCRIPTION] Running daily expiry check...");
    try {
      const subsQuery = query(
        collection(db, 'subscriptions'), 
        where('plan', '==', 'pro'),
        where('status', 'in', ['active', 'trialing'])
      );
      const subsSnap = await getDocs(subsQuery);
      const now = new Date();
      let downgradedCount = 0;

      for (const subDoc of subsSnap.docs) {
        const data = subDoc.data();
        if (data.currentPeriodEnd) {
          const expiryDate = new Date(data.currentPeriodEnd);
          if (expiryDate < now) {
            // Downgrade using SaaSService
            await SaaSService.checkExpiry(subDoc.id);
            downgradedCount++;
            console.log(`[SUBSCRIPTION] Downgraded user ${subDoc.id} due to expiry.`);
          }
        }
      }
      console.log(`[SUBSCRIPTION] Expiry check completed. Downgraded ${downgradedCount} users.`);
    } catch (err) {
      console.error("[SUBSCRIPTION] Expiry check failed:", err);
    }
  }

  // Run on start and then every 24 hours
  runSubscriptionExpiryCheck();
  setInterval(runSubscriptionExpiryCheck, 24 * 60 * 60 * 1000);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
