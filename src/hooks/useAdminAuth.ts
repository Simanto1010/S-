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

  const maskedEmail = ADMIN_EMAIL.replace(/(.{1}).*(@.*)/, "$1****$2");

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
      const res = await fetch('/api/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, otp })
      });

      if (res.ok) {
        setIsVerified(true);
        sessionStorage.setItem('admin_verified', 'true');
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

  const logout = useCallback(() => {
    setIsVerified(false);
    setIsOtpSent(false);
    sessionStorage.removeItem('admin_verified');
    toast.info('Admin session ended');
  }, []);

  // Session timeout logic
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
    maskedEmail,
    resendCooldown,
    isAdminEmail: auth.currentUser?.email === ADMIN_EMAIL
  };
}
