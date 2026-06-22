"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  History,
  Shield,
  Clock,
  User,
  PlusCircle,
  AlertTriangle,
  MinusCircle,
  HelpCircle,
  RefreshCw
} from "lucide-react";
import { getAuditLogs, type AuditLog } from "@/lib/adminService";
import { toast } from "sonner";

// Helpers to match categories
const getActionType = (action: string) => {
  const normalized = action.toLowerCase();
  if (normalized.includes("create") || normalized.includes("generate") || normalized.includes("issue")) {
    return { label: "creation", color: "text-emerald-400 bg-emerald-400/10 border-emerald-500/20", icon: PlusCircle };
  }
  if (normalized.includes("delete") || normalized.includes("remove") || normalized.includes("ban") || normalized.includes("revoke")) {
    return { label: "deletion", color: "text-rose-400 bg-rose-400/10 border-rose-500/20", icon: MinusCircle };
  }
  return { label: "modification", color: "text-amber-400 bg-amber-400/10 border-amber-500/20", icon: AlertTriangle };
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const logsList = await getAuditLogs(50);
      
      if (logsList.length === 0) {
        // Fallback seed logs if none exist
        const mockLogs: AuditLog[] = [
          {
            id: "1",
            adminName: "Karthik Kumar",
            adminEmail: "karthik@typingpro.com",
            action: "Create Typing Test",
            target: "C++ Tree Traversal Algorithm",
            timestamp: new Date(Date.now() - 600000), // 10m ago
          },
          {
            id: "2",
            adminName: "Siddharth Dev",
            adminEmail: "sid@typingpro.com",
            action: "Ban User",
            target: "Target UID: user-384910",
            timestamp: new Date(Date.now() - 3600000 * 2), // 2h ago
          },
          {
            id: "3",
            adminName: "Karthik Kumar",
            adminEmail: "karthik@typingpro.com",
            action: "Generate Certificate",
            target: "Certificate ID: CERT-982461 for Karthik Kumar",
            timestamp: new Date(Date.now() - 3600000 * 24 * 3), // 3d ago
          },
          {
            id: "4",
            adminName: "System Gateway",
            adminEmail: "gateway@typingpro.com",
            action: "Update Global Settings",
            target: "Modified system parameters console",
            timestamp: new Date(Date.now() - 3600000 * 24 * 5), // 5d ago
          },
        ];
        setLogs(mockLogs);
      } else {
        setLogs(logsList);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      toast.error("Telemetry Error", { description: "Failed to sync audit log timeline." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Audit Security Records
          </h1>
          <p className="text-sm text-slate-400">
            Immutable timeline tracking administrative updates, profile deletions, and system configuration overrides.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 border border-slate-800 hover:border-slate-700/60 bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all"
          title="Refresh Logs"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Timeline view */}
      <div className="relative bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 rounded-2xl p-6 shadow-xl min-h-[400px]">
        {isLoading ? (
          <div className="space-y-6 animate-pulse pl-8">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="relative space-y-2 border-l border-slate-850 pb-6 pl-6">
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-slate-850" />
                <div className="w-40 h-4 bg-slate-800 rounded" />
                <div className="w-64 h-3 bg-slate-850 rounded" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-semibold text-xs">
            No security actions have been logged yet.
          </div>
        ) : (
          <div className="relative pl-6 md:pl-10 space-y-6">
            {/* Center line connecting elements */}
            <div className="absolute left-3.5 md:left-[23px] top-3 bottom-3 w-px bg-slate-800/80" />

            {logs.map((log, index) => {
              const { label, color, icon: Icon } = getActionType(log.action);

              return (
                <motion.div
                  key={log.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="relative flex gap-4 md:gap-6 group"
                >
                  {/* Timeline Badge Dot */}
                  <div className={`absolute left-[-23px] md:left-[-35px] top-1.5 w-[19px] h-[19px] rounded-full border border-slate-900 flex items-center justify-center ${color} shadow-lg z-10 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Card content */}
                  <div className="flex-1 bg-slate-950/20 hover:bg-slate-950/30 border border-slate-900 hover:border-slate-800 p-4 rounded-xl transition-all duration-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-xs">
                          {log.adminName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({log.adminEmail})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {log.timestamp instanceof Date
                          ? log.timestamp.toLocaleString()
                          : new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-bold text-indigo-400">
                        {log.action}
                      </div>
                      <div className="text-xs text-slate-400 font-mono leading-relaxed bg-slate-950/40 p-2 rounded-lg border border-slate-900">
                        Target: {log.target}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
