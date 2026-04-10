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
      toast.error('Access Denied');
      return;
    }

    if (resendCooldown > 0) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL })
      });
      
      if (res.ok) {
        setIsOtpSent(true);
        setResendCooldown(30);
        toast.success(`OTP sent to ${maskedEmail}`);
        await logAdminAction(ADMIN_EMAIL, 'otp_request', 'success');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to send OTP');
        await logAdminAction(ADMIN_EMAIL, 'otp_request', 'failed', data.error);
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (otp: string) => {
    setIsLoading(true);
    try {
      const deviceInfo = {
        deviceId: getDeviceId(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      };

      const res = await fetch('/api/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, otp, deviceInfo })
      });

      if (res.ok) {
        const data = await res.json();
        setIsVerified(true);
        setSessionId(data.sessionId);
        sessionStorage.setItem('admin_verified', 'true');
        localStorage.setItem('admin_session_id', data.sessionId);
        setLastActivity(Date.now());
        toast.success('Admin access granted');
        await logAdminAction(ADMIN_EMAIL, 'otp_verification', 'success');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Invalid or expired code');
        await logAdminAction(ADMIN_EMAIL, 'otp_verification', 'failed', data.error);
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
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
    isAdminEmail: auth.currentUser?.email === ADMIN_EMAIL,
    isAdminRole: async () => {
      if (!auth.currentUser) return false;
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      return userDoc.exists() && userDoc.data()?.role === 'admin';
    }
  };
}
