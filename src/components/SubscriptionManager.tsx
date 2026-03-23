import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, Check, AlertCircle, Clock, Download, 
  QrCode, Smartphone, ShieldCheck, Info, History,
  ArrowRight, Sparkles, Zap, Shield, Globe, Cpu,
  RefreshCw
} from 'lucide-react';
import { SaaSService, PlanType, PLAN_LIMITS } from '../services/saasService';
import { db, auth, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';

interface SubscriptionManagerProps {
  user: any;
}

export default function SubscriptionManager({ user }: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check for expiry on mount
    SaaSService.checkExpiry(user.uid).catch(console.error);

    const unsubSub = onSnapshot(doc(db, 'subscriptions', user.uid), (doc) => {
      if (doc.exists()) {
        setSubscription(doc.data());
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `subscriptions/${user.uid}`);
    });

    const fetchHistory = async () => {
      try {
        const history = await SaaSService.getPaymentHistory(user.uid);
        setPaymentHistory(history);
      } catch (err) {
        console.error("Failed to fetch payment history:", err);
      }
    };

    fetchHistory();
    return () => unsubSub();
  }, [user]);

  const handlePaymentSubmit = async () => {
    if (!transactionId || !/^[a-zA-Z0-9]{12,}$/.test(transactionId)) {
      toast.error("Transaction ID must be at least 12 alphanumeric characters.");
      return;
    }

    if (!screenshot) {
      toast.error("Please upload a payment screenshot.");
      return;
    }

    setIsSubmitting(true);
    try {
      const amount = selectedPlan === 'monthly' ? 25 : 250;
      const result = await SaaSService.submitUPIPayment(
        user.uid,
        user.displayName || user.email,
        selectedPlan,
        amount,
        transactionId,
        screenshot
      );
      
      if (result.autoApproved) {
        toast.success("Payment verified instantly by AI! Pro activated.");
        setIsPaymentModalOpen(false);
      } else {
        toast.info(`AI verification inconclusive: ${result.aiReason}. Sent to admin review.`);
        setIsPaymentModalOpen(false);
      }
      
      setTransactionId('');
      setScreenshot(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription? You will keep your Pro features until the end of the current billing period.")) {
      return;
    }

    try {
      await SaaSService.cancelSubscription(user.uid);
      toast.success("Subscription cancellation scheduled.");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel subscription");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const plans = [
    {
      id: PlanType.FREE,
      name: 'Free Plan',
      price: '₹0',
      period: '',
      description: 'Perfect for exploring the platform',
      features: [
        '100 AI Calls / month',
        '20 Executions / month',
        '3 Platform Connectors',
        'Basic Automation',
        'Community Support'
      ],
      buttonText: 'Current Plan',
      disabled: true,
      highlight: false
    },
    {
      id: PlanType.PRO,
      name: 'Pro Plan',
      price: selectedPlan === 'monthly' ? '₹25' : '₹250',
      period: selectedPlan === 'monthly' ? '/ month' : '/ year',
      description: 'For power users and professionals',
      features: [
        'Unlimited AI Calls',
        'Unlimited Executions',
        'Unlimited Connectors',
        'Advanced AI Suggestions',
        'Autonomous Mode Enabled',
        'Priority Execution',
        'Team Collaboration (up to 10)',
        '24/7 Priority Support'
      ],
      buttonText: subscription?.plan === PlanType.PRO ? 'Active' : 'Upgrade to Pro',
      disabled: subscription?.plan === PlanType.PRO || subscription?.status === 'pending_verification',
      highlight: true
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">Active</span>;
      case 'pending_verification': return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/30">Pending Verification</span>;
      case 'rejected': return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">Rejected</span>;
      default: return <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full border border-white/5">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 lg:p-8">
      {/* Header & Current Plan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tighter mb-2">Subscription</h2>
          <p className="text-white/60">Manage your plan and billing history</p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
          <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
            <CreditCard className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-widest text-sm">
                {subscription?.plan || 'Free'} Plan
              </span>
              {subscription && getStatusBadge(subscription.status)}
            </div>
            <p className="text-xs text-white/40 mt-1">
              {subscription?.currentPeriodEnd 
                ? `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                : 'Lifetime access to basic features'}
            </p>
            {subscription?.plan === PlanType.PRO && !subscription?.cancelAtPeriodEnd && (
              <button 
                onClick={handleCancelSubscription}
                className="mt-2 text-[10px] text-red-400/60 hover:text-red-400 uppercase tracking-widest font-bold transition-colors"
              >
                Cancel Subscription
              </button>
            )}
            {subscription?.cancelAtPeriodEnd && (
              <p className="mt-2 text-[10px] text-amber-400/60 uppercase tracking-widest font-bold">
                Cancels on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {subscription?.status === 'pending_verification' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4 text-amber-400"
        >
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-lg">Payment Verification in Progress</h4>
            <p className="text-sm text-amber-400/60">Our team is manually verifying your UPI payment. This usually takes 1-2 hours.</p>
          </div>
        </motion.div>
      )}

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -5 }}
            className={`relative flex flex-col p-8 rounded-3xl border ${
              plan.highlight 
                ? 'bg-gradient-to-b from-cyan-500/10 to-transparent border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.1)]' 
                : 'bg-[#0a0a0a] border-white/5'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-cyan-500 text-black text-xs font-bold rounded-full uppercase tracking-widest">
                Recommended
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-sm text-white/50 mb-6">{plan.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-white/40">{plan.period}</span>
              </div>
              
              {plan.id === PlanType.PRO && (
                <div className="flex mt-4 p-1 bg-white/5 rounded-lg w-fit">
                  <button
                    onClick={() => setSelectedPlan('monthly')}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${selectedPlan === 'monthly' ? 'bg-cyan-500 text-black font-bold' : 'text-white/60'}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setSelectedPlan('yearly')}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${selectedPlan === 'yearly' ? 'bg-cyan-500 text-black font-bold' : 'text-white/60'}`}
                  >
                    Yearly (Save 15%)
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4 mb-8 flex-grow">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-cyan-400" />
                  </div>
                  <span className="text-white/80">{feature}</span>
                </div>
              ))}
            </div>

            <button
              disabled={plan.disabled}
              onClick={() => plan.id === PlanType.PRO && setIsPaymentModalOpen(true)}
              className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                plan.disabled 
                  ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                  : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
              }`}
            >
              {plan.buttonText}
              {!plan.disabled && <ArrowRight className="w-4 h-4" />}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Payment History */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-bottom border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold">Payment History</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/5">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Plan</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Transaction ID</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paymentHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/40 italic">
                    No payment history found
                  </td>
                </tr>
              ) : (
                paymentHistory.map((payment) => (
                  <tr key={payment.id} className="text-sm hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white/60">
                      {payment.createdAt?.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium uppercase tracking-wider text-xs">
                      {payment.planType}
                    </td>
                    <td className="px-6 py-4 text-cyan-400 font-bold">
                      ₹{payment.amount}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-white/40">
                      {payment.transactionId}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'approved' && (
                        <button className="p-2 hover:bg-white/10 rounded-lg text-cyan-400 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPI Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tighter">UPI Payment</h3>
                    <p className="text-sm text-white/50">Scan to upgrade to Pro</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                    <QrCode className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-8 rounded-[2.5rem] mb-8 flex flex-col items-center w-full max-w-[360px] mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[2.6rem] blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
                  
                  {/* UPI QR Code Container */}
                  <div className="relative w-full aspect-square bg-white rounded-3xl flex items-center justify-center overflow-hidden border-4 border-zinc-50 shadow-inner">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=upi://pay?pa=8389084579@slc%26pn=Simanto%20Mondal%26am=${selectedPlan === 'monthly' ? 25 : 250}%26cu=INR`}
                      alt="UPI QR Code"
                      className="w-full h-full object-contain p-2 sm:p-6"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/[0.01] pointer-events-none">
                      <Smartphone className="w-16 h-16 text-black/[0.03]" />
                    </div>
                  </div>
                  
                  <div className="mt-8 text-center w-full">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">Amount Due</span>
                      <div className="h-px flex-1 bg-zinc-100" />
                    </div>
                    <p className="text-black font-black text-4xl sm:text-5xl mb-2 tracking-tighter">₹{selectedPlan === 'monthly' ? 25 : 250}</p>
                    <div className="inline-flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-2xl border border-zinc-200">
                      <p className="text-zinc-600 text-xs font-mono font-bold">8389084579@slc</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                    <div className="flex gap-3">
                      <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <p className="text-xs text-white/70 leading-relaxed">
                        Scan and pay using any UPI app (PhonePe, Paytm, GPay). 
                        After payment, enter the 12-digit Transaction ID below.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Transaction ID (UTR)</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Enter 12-digit ID"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Payment Screenshot</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="screenshot-upload"
                      />
                      <label
                        htmlFor="screenshot-upload"
                        className="flex items-center justify-center gap-2 w-full bg-white/5 border border-dashed border-white/20 rounded-xl px-4 py-3 text-sm cursor-pointer hover:bg-white/10 transition-all"
                      >
                        {screenshot ? (
                          <div className="flex items-center gap-2 text-cyan-400">
                            <Check className="w-4 h-4" />
                            <span>Screenshot Selected</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-white/60">
                            <Download className="w-4 h-4" />
                            <span>Upload Screenshot</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsPaymentModalOpen(false);
                        setScreenshot(null);
                        setTransactionId('');
                      }}
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isSubmitting || !transactionId || !screenshot}
                      onClick={handlePaymentSubmit}
                      className="flex-[2] py-3 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-50 relative overflow-hidden"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>AI Verifying...</span>
                        </div>
                      ) : (
                        'I HAVE PAID'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-4 flex items-center justify-center gap-4 border-t border-white/5">
                <ShieldCheck className="w-4 h-4 text-white/40" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Secure Manual Verification</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
