import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, XCircle, Clock, Search, 
  Filter, User, CreditCard, Calendar,
  ExternalLink, ShieldAlert, RefreshCw,
  Sparkles
} from 'lucide-react';
import { db, auth, serverTimestamp } from '../firebase';
import { 
  collection, query, where, onSnapshot, 
  doc, updateDoc, getDoc, orderBy, limit,
  handleFirestoreError, OperationType 
} from '../firebase';
import { toast } from 'sonner';
import { PlanType, PLAN_LIMITS } from '../services/saasService';
import { ActivityLogService } from '../services/activityLogService';

export default function AdminPaymentVerification() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'paymentRequests'),
      where('status', '==', filter),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'paymentRequests');
      setLoading(false);
    });

    return () => unsub();
  }, [filter]);

  const handleApprove = async (request: any) => {
    try {
      // 1. Update Payment Request
      await updateDoc(doc(db, 'paymentRequests', request.id), {
        status: 'approved',
        verifiedAt: serverTimestamp()
      });

      // 2. Update User Subscription
      const subRef = doc(db, 'subscriptions', request.userId);
      const subSnap = await getDoc(subRef);
      
      const currentPeriodEnd = new Date();
      if (request.planType === 'monthly') {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      } else {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      }

      await updateDoc(subRef, {
        plan: PlanType.PRO,
        status: 'active',
        paymentMethod: 'upi',
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        features: PLAN_LIMITS[PlanType.PRO],
        lastTransactionId: request.transactionId,
        updatedAt: serverTimestamp()
      });

      ActivityLogService.log(request.userId, `Payment approved by admin: ${request.transactionId}`, 'success', 'payment');
      toast.success(`Payment approved for ${request.userName}`);
    } catch (err) {
      console.error("Failed to approve payment:", err);
      toast.error("Failed to approve payment");
    }
  };

  const handleReject = async (request: any) => {
    try {
      await updateDoc(doc(db, 'paymentRequests', request.id), {
        status: 'rejected',
        verifiedAt: serverTimestamp()
      });

      // Reset subscription status if it was pending
      const subRef = doc(db, 'subscriptions', request.userId);
      await updateDoc(subRef, {
        status: 'active' // Revert to active (usually free plan)
      });

      ActivityLogService.log(request.userId, `Payment rejected by admin: ${request.transactionId}`, 'error', 'payment');
      toast.success(`Payment rejected for ${request.userName}`);
    } catch (err) {
      console.error("Failed to reject payment:", err);
      toast.error("Failed to reject payment");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <h2 className="text-3xl font-bold tracking-tighter">Payment Verification</h2>
          </div>
          <p className="text-white/60 text-sm">Review and approve manual UPI payment requests</p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
          {(['pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all capitalize ${
                filter === f ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-20 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-bold mb-2">No {filter} requests</h3>
            <p className="text-white/40">Everything is up to date</p>
          </div>
        ) : (
          requests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <User className="w-6 h-6 text-white/40" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{req.userName}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-white/40 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {req.createdAt?.toDate().toLocaleString()}
                    </span>
                    <span className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
                      {req.planType}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:items-end gap-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-white/40" />
                  <span className="font-mono text-sm font-bold">₹{req.amount}</span>
                </div>
                <div className="text-xs text-white/40 font-mono">
                  TXN: {req.transactionId}
                </div>
                {req.screenshotUrl && (
                  <button 
                    onClick={() => setSelectedImage(req.screenshotUrl)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline mt-1 font-bold"
                  >
                    View Screenshot
                  </button>
                )}
                {req.aiAnalysis && (
                  <div className={`mt-2 p-2 rounded-lg border text-[10px] ${
                    req.aiAnalysis.autoApprove 
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                      : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                  }`}>
                    <div className="font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Insights
                    </div>
                    <p>Confidence: {(req.aiAnalysis.confidence * 100).toFixed(0)}%</p>
                    <p>Reason: {req.aiAnalysis.reason}</p>
                    <p>App: {req.aiAnalysis.upi_app}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {filter === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleReject(req)}
                      className="flex-1 md:flex-none px-6 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl font-bold text-sm transition-all border border-red-500/20 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(req)}
                      className="flex-1 md:flex-none px-6 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl font-bold text-sm transition-all border border-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                  </>
                ) : (
                  <div className={`px-4 py-2 rounded-xl font-bold text-sm border flex items-center gap-2 ${
                    filter === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {filter === 'approved' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {filter === 'approved' ? 'Approved' : 'Rejected'}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-white/10"
            >
              <img 
                src={selectedImage} 
                alt="Payment Screenshot" 
                className="w-full h-full object-contain"
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
