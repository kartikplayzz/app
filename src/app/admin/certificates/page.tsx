"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Search,
  Plus,
  Trash2,
  FileCheck,
  Slash,
  ShieldCheck,
  ShieldAlert,
  Clock,
  X,
  User,
  ExternalLink
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { logAdminAction } from "@/lib/adminService";
import { toast } from "sonner";

interface Certificate {
  id?: string;
  candidateName: string;
  candidateUid: string;
  speed: number;
  accuracy: number;
  mode: string;
  status: "Valid" | "Revoked";
  issuedAt: any;
}

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Valid" | "Revoked">("all");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const [verifiedCert, setVerifiedCert] = useState<Certificate | null>(null);
  const [isVerifyChecked, setIsVerifyChecked] = useState(false);

  // Form Fields
  const [candidateName, setCandidateName] = useState("");
  const [candidateUid, setCandidateUid] = useState("");
  const [speed, setSpeed] = useState<number>(60);
  const [accuracy, setAccuracy] = useState<number>(98);
  const [mode, setMode] = useState("English");

  const fetchCertificates = async () => {
    setIsLoading(true);
    try {
      if (!db) {
        // Fallback mock certificates
        const mockCerts: Certificate[] = [
          {
            id: "CERT-982461",
            candidateName: "Karthik Kumar",
            candidateUid: "user-1",
            speed: 84,
            accuracy: 99,
            mode: "English",
            status: "Valid",
            issuedAt: new Date(Date.now() - 3600000 * 24 * 3),
          },
          {
            id: "CERT-184592",
            candidateName: "Siddharth Dev",
            candidateUid: "user-2",
            speed: 95,
            accuracy: 98,
            mode: "Programming",
            status: "Valid",
            issuedAt: new Date(Date.now() - 3600000 * 24 * 7),
          },
          {
            id: "CERT-384910",
            candidateName: "Shreya Gupta",
            candidateUid: "user-3",
            speed: 68,
            accuracy: 92,
            mode: "English",
            status: "Revoked",
            issuedAt: new Date(Date.now() - 3600000 * 24 * 14),
          },
        ];
        setCerts(mockCerts);
        setIsLoading(false);
        return;
      }

      const querySnapshot = await getDocs(collection(db, "certificates"));
      const certsList: Certificate[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        certsList.push({
          id: docSnap.id,
          candidateName: data.candidateName || "Candidate",
          candidateUid: data.candidateUid || "Unknown",
          speed: data.speed || 0,
          accuracy: data.accuracy || 0,
          mode: data.mode || "English",
          status: data.status || "Valid",
          issuedAt: data.issuedAt ? data.issuedAt.toDate() : new Date(),
        });
      });
      setCerts(certsList);
    } catch (err) {
      console.error("Failed to fetch certificates:", err);
      toast.error("Database Error", { description: "Could not fetch certificates." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleGenerateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!candidateName.trim()) {
      toast.error("Validation Error", { description: "Candidate name is required." });
      return;
    }

    try {
      const generatedId = `CERT-${Math.floor(100000 + Math.random() * 900000)}`;
      const certData = {
        candidateName: candidateName.trim(),
        candidateUid: candidateUid.trim() || "anonymous-uid",
        speed: Number(speed),
        accuracy: Number(accuracy),
        mode,
        status: "Valid" as const,
        issuedAt: new Date(),
      };

      if (db) {
        await setDoc(doc(db, "certificates", generatedId), {
          ...certData,
          issuedAt: serverTimestamp(),
        });
      }

      setCerts((prev) => [{ id: generatedId, ...certData }, ...prev]);
      await logAdminAction("Generate Certificate", `Certificate ID: ${generatedId} for ${candidateName}`);
      
      toast.success("Certificate Issued", {
        description: `Successfully generated certificate ID: ${generatedId}`,
      });
      setIsGenerateOpen(false);
      setCandidateName("");
      setCandidateUid("");
    } catch (err) {
      console.error("Failed to generate certificate:", err);
      toast.error("Failed to issue certificate.");
    }
  };

  const handleToggleRevoke = async (certId: string, currentStatus: "Valid" | "Revoked") => {
    const nextStatus = currentStatus === "Valid" ? "Revoked" : "Valid";
    const confirmAction = window.confirm(`Are you sure you want to ${currentStatus === "Valid" ? "revoke" : "restore"} certificate ${certId}?`);
    if (!confirmAction) return;

    try {
      if (db) {
        await setDoc(doc(db, "certificates", certId), { status: nextStatus }, { merge: true });
      }

      setCerts((prev) =>
        prev.map((c) => (c.id === certId ? { ...c, status: nextStatus } : c))
      );

      await logAdminAction(
        nextStatus === "Revoked" ? "Revoke Certificate" : "Restore Certificate",
        `Certificate ID: ${certId}`
      );

      toast.success(nextStatus === "Revoked" ? "Certificate Revoked" : "Certificate Restored", {
        description: `Credential status updated for ${certId}.`,
      });
    } catch (err) {
      console.error("Failed to toggle certificate status:", err);
      toast.error("Operation Failed");
    }
  };

  const handleVerifyCheck = () => {
    setIsVerifyChecked(true);
    const matched = certs.find((c) => c.id?.toUpperCase() === verificationId.trim().toUpperCase());
    setVerifiedCert(matched || null);
  };

  const filteredCerts = certs.filter((c) => {
    const matchesSearch =
      c.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      c.id?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Certificate Registry
          </h1>
          <p className="text-sm text-slate-400">
            Generate official typing credentials, query valid awards, or revoke matching IDs.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Verify Button */}
          <button
            onClick={() => {
              setVerificationId("");
              setVerifiedCert(null);
              setIsVerifyChecked(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700/60 text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-850 transition-all"
          >
            <FileCheck className="w-4.5 h-4.5" />
            Quick Verification
          </button>

          {/* Issue Button */}
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4.5 h-4.5" />
            Generate Award
          </button>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/10 backdrop-blur-xl border border-slate-800/40 p-4 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by candidate name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none transition-colors"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {(["all", "Valid", "Revoked"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border capitalize transition-all ${
                statusFilter === status
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                  : "bg-slate-950/20 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {status} credentials
            </button>
          ))}
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-slate-400 text-xs font-bold tracking-wider select-none bg-slate-950/10">
                <th className="py-4 px-5">Certificate ID</th>
                <th className="py-4 px-5">Candidate</th>
                <th className="py-4 px-5">Speed Run Detail</th>
                <th className="py-4 px-5">Issued Date</th>
                <th className="py-4 px-5">Award Status</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 text-slate-300 text-xs">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-5"><div className="w-24 h-4 bg-slate-800 rounded" /></td>
                    <td className="py-4 px-5"><div className="w-32 h-4 bg-slate-800 rounded" /></td>
                    <td className="py-4 px-5"><div className="w-24 h-4 bg-slate-850 rounded" /></td>
                    <td className="py-4 px-5"><div className="w-20 h-4 bg-slate-850 rounded" /></td>
                    <td className="py-4 px-5"><div className="w-16 h-4 bg-slate-800 rounded-full" /></td>
                    <td className="py-4 px-5 text-right"><div className="w-10 h-6 bg-slate-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredCerts.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-850/20 transition-all duration-150">
                  <td className="py-3.5 px-5 font-mono text-[11px] font-bold text-indigo-400">
                    {cert.id}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-850 flex items-center justify-center text-slate-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-slate-200">{cert.candidateName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="font-mono text-slate-300">
                      {cert.speed} WPM ({cert.accuracy}% Acc) in {cert.mode}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-400 flex items-center gap-1.5 pt-4.5">
                    <Clock className="w-3.5 h-3.5" />
                    {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : "Recently"}
                  </td>
                  <td className="py-3.5 px-5">
                    {cert.status === "Valid" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" /> Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">
                        <ShieldAlert className="w-3.5 h-3.5" /> Revoked
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleToggleRevoke(cert.id!, cert.status)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        cert.status === "Valid"
                          ? "border-red-950/20 hover:bg-red-950/30 text-red-400"
                          : "border-emerald-950/20 hover:bg-emerald-950/30 text-emerald-400"
                      }`}
                    >
                      {cert.status === "Valid" ? "Revoke" : "Restore"}
                    </button>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredCerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs font-semibold">
                    No matching awards found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Award Modal */}
      <AnimatePresence>
        {isGenerateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGenerateOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-slate-850 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Award className="w-4.5 h-4.5 text-indigo-400" /> Issue Typing Certificate
                </h3>
                <button
                  onClick={() => setIsGenerateOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGenerateCertificate} className="p-6 space-y-4">
                {/* Candidate Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Candidate Full Name</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="e.g. Kartikey Singh"
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3.5 py-2 text-xs focus:outline-none text-slate-200"
                  />
                </div>

                {/* Candidate UID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">User UID (Optional)</label>
                  <input
                    type="text"
                    value={candidateUid}
                    onChange={(e) => setCandidateUid(e.target.value)}
                    placeholder="e.g. kH284hJk9811n..."
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3.5 py-2 text-xs focus:outline-none text-slate-200"
                  />
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Typing Speed (WPM)</label>
                    <input
                      type="number"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3.5 py-2 text-xs focus:outline-none text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Accuracy (%)</label>
                    <input
                      type="number"
                      value={accuracy}
                      onChange={(e) => setAccuracy(Number(e.target.value))}
                      max={100}
                      className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3.5 py-2 text-xs focus:outline-none text-slate-200"
                    />
                  </div>
                </div>

                {/* Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Exam Trial Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-200"
                  >
                    <option value="English">English Pro</option>
                    <option value="Hindi">Hindi Basic</option>
                    <option value="Programming">Programming Blocks</option>
                    <option value="Numbers">Numbers Grid</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsGenerateOpen(false)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all"
                  >
                    Sign & Issue
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Verification Query Modal */}
      <AnimatePresence>
        {isVerifyChecked === false && verifiedCert === null && (
          // Use a state checking if we clicked to open verification modal
          // We can toggle it by checking if isVerifyChecked !== undefined
          // Let's create a verification modal trigger
          null
        )}
      </AnimatePresence>
    </div>
  );
}
