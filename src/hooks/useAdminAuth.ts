import { useState, useEffect, useCallback } from 'react';
import { auth, db, doc, getDoc, logAdminAction } from '../firebase';
import { toast } from 'sonner';

const ADMIN_EMAIL = 'mbidhan474@gmail.com';
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function useAdminAuth() {
  const [isVerified, setIsVerified] = useState(() => sessionStorage.getItem('admin_verified') === 'true');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('admin_session_id'));
  const [threats, setThreats] = useState<any[]>([]);
  const [riskScore, setRiskScore] = useState(0);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);

  const maskedEmail = ADMIN_EMAIL.replace(/(.{1}).*(@.*)/, "$1****$2");

  // Device ID generation/retrieval
  const getDeviceId = useCallback(() => {
    let id = localStorage.getItem('admin_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('admin_device_id', id);
    }
    return id;
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendOtp = async () => {
    if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL) {
      console.warn('[ADMIN AUTH] Unauthorized attempt to send OTP:', auth.currentUser?.email);
      toast.error('Access Denied');
      return;
    }

    if (resendCooldown > 0) return;

    setIsLoading(true);
    
    // 10-second timeout for sending OTP
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        toast.error('Request timed out. Please check your connection.');
        console.warn('[ADMIN AUTH] sendOtp timed out after 10s');
      }
    }, 10000);

    try {
      console.log('[ADMIN AUTH] Requesting OTP for:', ADMIN_EMAIL);
      const res = await fetch('/api/admin/send-otp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: ADMIN_EMAIL })
      });
      
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[ADMIN AUTH] Non-JSON response from send-otp:', text.substring(0, 100));
        throw new Error('Server returned invalid response format');
      }

      const data = await res.json();
      console.log('[ADMIN AUTH] sendOtp response:', data);

      if (res.ok && data.success) {
        setIsOtpSent(true);
        setResendCooldown(30);
        toast.success(data.message || `OTP sent to ${maskedEmail}`);
        await logAdminAction(ADMIN_EMAIL, 'otp_request', 'success');
      } else {
        toast.error(data.error || 'Failed to send OTP');
        await logAdminAction(ADMIN_EMAIL, 'otp_request', 'failed', data.error);
      }
    } catch (error: any) {
      console.error('[ADMIN AUTH] sendOtp error:', error);
      toast.error(error.message || 'Network error');
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const verifyOtp = async (otp: string) => {
    setIsLoading(true);
    
    // 5-second fallback to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        toast.error('Verification timed out. Please try again.');
        console.warn('[ADMIN AUTH] Verification timed out after 5s');
      }
    }, 5000);

    try {
      const deviceInfo = {
        deviceId: getDeviceId(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      };

      console.log('[ADMIN AUTH] Verifying OTP for:', ADMIN_EMAIL);
      const res = await fetch('/api/admin/verify-otp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: ADMIN_EMAIL, otp, deviceInfo })
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[ADMIN AUTH] Non-JSON response received:', text.substring(0, 100));
        throw new Error(`Server returned non-JSON response (${res.status}). This usually means the server is misconfigured or crashing.`);
      }

      const data = await res.json();
      console.log("OTP verify response:", data);
      clearTimeout(timeoutId);

      if (res.ok && data.success) {
        setIsVerified(true);
        setSessionId(data.sessionId);
        sessionStorage.setItem('admin_verified', 'true');
        localStorage.setItem('admin_session_id', data.sessionId);
        localStorage.setItem('adminSession', data.sessionId); // User requested specific key
        setLastActivity(Date.now());
        toast.success('Admin access granted');
        await logAdminAction(ADMIN_EMAIL, 'otp_verification', 'success');
        
        // Return success for frontend navigation if needed
        return { success: true };
      } else {
        toast.error(data.error || 'Invalid or expired code');
        await logAdminAction(ADMIN_EMAIL, 'otp_verification', 'failed', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('[ADMIN AUTH] Verification error:', error);
      toast.error('Verification failed');
      return { success: false, error: 'Network error' };
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logAdminAction(ADMIN_EMAIL, 'logout', 'success');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      
      // Clear all session and local storage
      sessionStorage.clear();
      localStorage.removeItem("adminAuth");
      localStorage.removeItem("admin_verified");
      localStorage.removeItem("admin_session_id");
      
      // Reset states
      setIsVerified(false);
      setIsOtpSent(false);
      setSessionId(null);
      
      toast.success('Admin session ended successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      sessionStorage.clear();
      window.location.reload();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logoutAllDevices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/logout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL })
      });
      if (res.ok) {
        toast.success('All devices logged out');
        logout();
      } else {
        toast.error('Failed to logout all devices');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSecurity = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/reset-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL })
      });
      if (res.ok) {
        toast.success('Security state reset successfully');
      } else {
        toast.error('Failed to reset security');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const removeDevice = async (deviceId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL })
      });
      if (res.ok) {
        toast.success('Device removed');
      } else {
        toast.error('Failed to remove device');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  // Level 3: Session Validation Logic
  useEffect(() => {
    if (!isVerified || !sessionId) return;

    const validateSession = async () => {
      try {
        const res = await fetch('/api/admin/validate-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, email: ADMIN_EMAIL })
        });

        if (!res.ok) {
          toast.error('Session invalidated by another login or expired');
          logout();
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
    };

    const interval = setInterval(validateSession, 30000); // Validate every 30s
    return () => clearInterval(interval);
  }, [isVerified, sessionId, logout]);

  // Session timeout logic (inactivity)
  useEffect(() => {
    if (!isVerified) return;

    const interval = setInterval(() => {
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        logout();
      }
    }, 60000); // Check every minute

    const updateActivity = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
    };
  }, [isVerified, lastActivity, logout]);

  // Level 5: Threat Monitoring
  useEffect(() => {
    if (!isVerified) return;

    const fetchThreats = async () => {
      try {
        const res = await fetch(`/api/admin/threats?email=${ADMIN_EMAIL}`);
        if (res.ok) {
          const data = await res.json();
          setThreats(data.threats);
          if (data.threats.length > 0) {
            setRiskScore(data.threats[0].riskScore);
          }
        }
      } catch (error) {
        console.error('Failed to fetch threats:', error);
      }
    };

    fetchThreats();
    const interval = setInterval(fetchThreats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [isVerified]);

  // Level 5: AI Recommendations
  useEffect(() => {
    if (!isVerified || threats.length === 0) return;

    const generateRecommendations = async () => {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const latestThreat = threats[0];
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `As a security expert, analyze this risk assessment and provide 3 short, actionable recommendations for the admin.
          Risk Score: ${latestThreat.riskScore}/100
          Level: ${latestThreat.riskLevel}
          Reasons: ${latestThreat.details}
          
          Format: Return a JSON array of strings.`,
          config: {
            responseMimeType: "application/json"
          }
        });
        
        setAiRecommendations(JSON.parse(response.text));
      } catch (e) {
        console.error("Failed to generate AI recommendations:", e);
      }
    };

    generateRecommendations();
  }, [isVerified, threats]);

  return {
    isVerified,
    isOtpSent,
    isLoading,
    sendOtp,
    verifyOtp,
    logout,
    logoutAllDevices,
    resetSecurity,
    removeDevice,
    maskedEmail,
    resendCooldown,
    sessionId,
    threats,
    riskScore,
    aiRecommendations,
    isAdminEmail: auth.currentUser?.email === ADMIN_EMAIL,
    isAdminRole: async () => {
      if (!auth.currentUser) return false;
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      return userDoc.exists() && userDoc.data()?.role === 'admin';
    }
  };
}
