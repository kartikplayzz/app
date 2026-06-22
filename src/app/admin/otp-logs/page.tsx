"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Mail,
  UserCheck,
  Lock,
  Search,
  Clock,
  Eye,
  Activity,
  AlertTriangle,
  Smartphone,
  Globe,
  X
} from "lucide-react";
import { toast } from "sonner";

interface SecurityLog {
  id: string;
  email: string;
  type: "send" | "verify_success" | "verify_failure" | "resend" | "rate_limit_block" | "abuse_lock";
  ipAddress: string;
  deviceId: string;
  userAgent: string;
  timestamp: number;
  details: string;
}

interface SentEmail {
  id: string;
  email: string;
  subject: string;
  html: string;
  sentAt: number;
  recipientName: string;
  deliveryStatus: string;
}

export default function AdminOtpLogsPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [activeLocks, setActiveLocks] = useState<{ email: string; lockedUntil: number; attempts: number }[]>([]);
  const [selectedEmailPreview, setSelectedEmailPreview] = useState<SentEmail | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Subscribe to security logs (limit 150)
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "otp_logs"), orderBy("timestamp", "desc"), limit(150));
    
    return onSnapshot(q, (snapshot) => {
      const logsList: SecurityLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        logsList.push({
          id: doc.id,
          email: data.email || "",
          type: data.type || "send",
          ipAddress: data.ipAddress || "127.0.0.1",
          deviceId: data.deviceId || "unknown",
          userAgent: data.userAgent || "",
          timestamp: data.timestamp || Date.now(),
          details: data.details || ""
        });
      });
      setLogs(logsList);
    }, (err) => {
      console.error("Failed to subscribe to security logs:", err);
      toast.error("Access denied. Admin credentials required.");
    });
  }, []);

  // Subscribe to active locks in otp_verifications
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "otp_verifications"));
    
    return onSnapshot(q, (snapshot) => {
      const locksList: { email: string; lockedUntil: number; attempts: number }[] = [];
      const now = Date.now();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.lockedUntil && data.lockedUntil > now) {
          locksList.push({
            email: doc.id,
            lockedUntil: data.lockedUntil,
            attempts: data.attempts || 0
          });
        }
      });
      setActiveLocks(locksList);
    }, (err) => {
      console.warn("Failed to subscribe to active locks:", err);
    });
  }, []);

  // Fetch the latest sent email HTML for a user to preview
  const handlePreviewEmail = async (email: string) => {
    if (!db) return;
    setLoadingEmail(true);
    try {
      const emailsCol = collection(db, "sent_emails");
      const q = query(
        emailsCol,
        where("email", "==", email.trim().toLowerCase()),
        orderBy("sentAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.info("No sent email found in archive for this address.");
        setSelectedEmailPreview(null);
      } else {
        const d = snap.docs[0];
        const data = d.data();
        setSelectedEmailPreview({
          id: d.id,
          email: data.email,
          subject: data.subject,
          html: data.html,
          sentAt: data.sentAt,
          recipientName: data.recipientName || "User",
          deliveryStatus: data.deliveryStatus || "Delivered"
        });
      }
    } catch (err) {
      console.error("Failed to fetch sent email preview:", err);
      toast.error("Failed to retrieve email HTML template.");
    } finally {
      setLoadingEmail(false);
    }
  };

  // Compute stats metrics
  const totalVerifications = logs.filter(l => l.type === "verify_success").length;
  const totalFailures = logs.filter(l => l.type === "verify_failure").length;
  const totalResends = logs.filter(l => l.type === "resend").length;
  const totalAbuseAlerts = logs.filter(l => l.type === "abuse_lock" || l.type === "rate_limit_block").length;

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === "all") return matchesSearch;
    return matchesSearch && log.type === filterType;
  });

  const getLogTypeConfig = (type: string) => {
    switch (type) {
      case "verify_success":
        return { label: "Success", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: ShieldCheck };
      case "verify_failure":
        return { label: "Failed Attempt", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: ShieldAlert };
      case "resend":
        return { label: "Code Sent", bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", icon: Mail };
      case "abuse_lock":
        return { label: "Security Lockout", bg: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: Lock };
      case "rate_limit_block":
        return { label: "Rate Limit Triggered", bg: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertTriangle };
      default:
        return { label: "Event", bg: "bg-slate-800 text-slate-300 border-slate-700", icon: Activity };
    }
  };

  return (
    <div className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-20 pt-2">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
            OTP & Security Monitor
          </h1>
          <p className="text-xs text-muted-foreground">
            Real-time audit dashboard for disposable emails, brute force checks, rate limits, and credentials delivery.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
          ACTIVE GUARDIAN NODE
        </div>
      </div>

      {/* Metrics Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total success */}
        <div className="glass-panel p-4.5 rounded-2xl border border-white/5 flex flex-col gap-1.5 relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verifications
          </span>
          <span className="text-3xl font-black text-white leading-none mt-1">{totalVerifications}</span>
        </div>

        {/* Failed attempts */}
        <div className="glass-panel p-4.5 rounded-2xl border border-white/5 flex flex-col gap-1.5 relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-amber-500/5 blur-2xl group-hover:bg-amber-500/10 transition-colors" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Failed Entry
          </span>
          <span className="text-3xl font-black text-white leading-none mt-1">{totalFailures}</span>
        </div>

        {/* Total sends */}
        <div className="glass-panel p-4.5 rounded-2xl border border-white/5 flex flex-col gap-1.5 relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-indigo-400" /> OTP Deliveries
          </span>
          <span className="text-3xl font-black text-white leading-none mt-1">{totalResends}</span>
        </div>

        {/* Total security alerts */}
        <div className="glass-panel p-4.5 rounded-2xl border border-white/5 flex flex-col gap-1.5 relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-rose-500/5 blur-2xl group-hover:bg-rose-500/10 transition-colors" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Security Blocks
          </span>
          <span className="text-3xl font-black text-white leading-none mt-1">{totalAbuseAlerts}</span>
        </div>
      </div>

      {/* Main Panel Content split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Active locks monitor */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="glass-panel p-5 rounded-3xl border border-white/5 flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400" /> Active Account Locks
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Temporary 15-minute lockouts in place due to abuse.</p>
            </div>

            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
              <AnimatePresence>
                {activeLocks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                    No active account locks detected
                  </div>
                ) : (
                  activeLocks.map((lock) => {
                    const secsLeft = Math.ceil((lock.lockedUntil - Date.now()) / 1000);
                    const minLeft = Math.ceil(secsLeft / 60);

                    return (
                      <motion.div
                        key={lock.email}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-3 bg-rose-500/[0.02] border border-rose-500/10 rounded-2xl flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-200 truncate max-w-[170px]" title={lock.email}>
                            {lock.email}
                          </span>
                          <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase">
                            Locked
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" /> {minLeft}m remaining
                          </span>
                          <span>{lock.attempts} attempts</span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Side: Security Logs Table */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Controls Ribbon */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search email, IP, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/30 border border-white/5 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 transition-all duration-300"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-1.5 self-end sm:self-center">
              {["all", "send", "verify_success", "verify_failure", "abuse_lock"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase border transition-all ${
                    filterType === type
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                      : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Audit Logs Board */}
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-950/20 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-5">Timestamp</th>
                    <th className="py-4 px-4">Entity User</th>
                    <th className="py-4 px-4">Event Type</th>
                    <th className="py-4 px-4">Network Info</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02] text-xs">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                        No security logs match your search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      });
                      const dateStr = new Date(log.timestamp).toLocaleDateString([], {
                        month: "short",
                        day: "2-digit"
                      });
                      
                      const config = getLogTypeConfig(log.type);
                      const BadgeIcon = config.icon;

                      return (
                        <tr key={log.id} className="hover:bg-white/[0.01] transition-all">
                          {/* Time */}
                          <td className="py-4.5 px-5 font-medium whitespace-nowrap">
                            <span className="text-white font-mono">{timeStr}</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">{dateStr}</span>
                          </td>

                          {/* User email */}
                          <td className="py-4.5 px-4 font-semibold text-slate-300 max-w-[180px] truncate" title={log.email}>
                            {log.email}
                          </td>

                          {/* Badge tag */}
                          <td className="py-4.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${config.bg}`}>
                              <BadgeIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                          </td>

                          {/* Network */}
                          <td className="py-4.5 px-4 whitespace-nowrap font-mono text-[10px] text-slate-400">
                            <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-slate-500" /> {log.ipAddress}</span>
                            <span className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5"><Smartphone className="w-3 h-3" /> {log.deviceId.slice(0, 10)}...</span>
                          </td>

                          {/* Actions */}
                          <td className="py-4.5 px-5 text-right whitespace-nowrap">
                            {log.type === "resend" ? (
                              <button
                                onClick={() => handlePreviewEmail(log.email)}
                                disabled={loadingEmail}
                                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 hover:border-indigo-500/40 text-indigo-400 text-[10px] font-bold uppercase rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Preview Email
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic font-mono px-2 truncate max-w-[120px] block text-right" title={log.details}>
                                {log.details}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Branded Email Previewer Modal */}
      <AnimatePresence>
        {selectedEmailPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Modal header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sent Email Archival Preview</span>
                  <h3 className="text-xs font-black text-slate-200">
                    Recipient: {selectedEmailPreview.recipientName} ({selectedEmailPreview.email})
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEmailPreview(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status details bar */}
              <div className="px-5 py-2.5 bg-slate-950/20 text-[10px] font-mono text-slate-500 flex justify-between border-b border-white/5">
                <span>Subject: {selectedEmailPreview.subject}</span>
                <span className="text-indigo-400 font-bold uppercase">{selectedEmailPreview.deliveryStatus}</span>
              </div>

              {/* Iframe preview container */}
              <div className="flex-1 overflow-y-auto bg-[#050816] p-4 flex items-center justify-center">
                <div className="w-full max-w-lg border border-white/5 rounded-2xl overflow-hidden shadow-inner bg-[#050816] h-[55vh]">
                  <iframe
                    srcDoc={selectedEmailPreview.html}
                    className="w-full h-full border-none bg-[#050816]"
                    title="Sent Email Template Preview"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 bg-slate-950/40 text-right">
                <button
                  onClick={() => setSelectedEmailPreview(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition-all active:scale-95"
                >
                  Close Archive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
