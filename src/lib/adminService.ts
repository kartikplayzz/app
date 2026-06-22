import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from "firebase/firestore";

export interface AuditLog {
  id?: string;
  adminName: string;
  adminEmail: string;
  action: string;
  target: string;
  timestamp: any;
}

/**
 * Log an administrative action to the audit logs collection in Firestore
 */
export async function logAdminAction(action: string, target: string) {
  try {
    if (!db || !auth) {
      console.warn("Firestore/Auth not configured. Skipping audit log.");
      return;
    }

    const currentUser = auth.currentUser;
    const adminEmail = currentUser?.email || "unknown-admin@typingpro.com";
    const adminName = currentUser?.displayName || adminEmail.split("@")[0] || "Administrator";

    const logData = {
      adminName,
      adminEmail,
      action,
      target,
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, "audit_logs"), logData);
  } catch (err) {
    console.error("Failed to log admin action:", err);
  }
}

/**
 * Fetch recent audit logs from Firestore
 */
export async function getAuditLogs(maxLogs: number = 50): Promise<AuditLog[]> {
  try {
    if (!db) return [];
    
    const logsCol = collection(db, "audit_logs");
    const q = query(logsCol, orderBy("timestamp", "desc"), limit(maxLogs));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        adminName: data.adminName || "Unknown Admin",
        adminEmail: data.adminEmail || "",
        action: data.action || "",
        target: data.target || "",
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
      };
    });
  } catch (err) {
    console.error("Failed to fetch audit logs:", err);
    return [];
  }
}
