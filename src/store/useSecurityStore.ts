import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

// IndexedDB storage for Zustand to support offline capabilities and large datasets
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export interface ThreatEvent {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  riskScore: number;
  username: string;
  ip: string;
  deviceId: string;
  status: 'flagged' | 'blocked' | 'resolved';
}

export interface SecurityMetrics {
  activeUsers: number;
  humanVerificationRate: number;
  botDetectionRate: number;
  fraudAttempts: number;
  suspiciousAccounts: number;
  blockedDevicesCount: number;
  blockedIpsCount: number;
}

interface SecurityState {
  blockedIps: string[];
  blockedDevices: string[];
  suspendedUsers: string[];
  threatLogs: ThreatEvent[];
  verifiedRuns: Record<string, { wpm: number; accuracy: number; trustScore: number; timestamp: number }>;
  metrics: SecurityMetrics;
  
  // Actions
  blockIp: (ip: string) => void;
  unblockIp: (ip: string) => void;
  blockDevice: (deviceId: string) => void;
  unblockDevice: (deviceId: string) => void;
  suspendUser: (username: string) => void;
  unsuspendUser: (username: string) => void;
  addThreatLog: (
    type: string,
    description: string,
    riskScore: number,
    username?: string,
    ip?: string,
    deviceId?: string
  ) => void;
  resolveThreatLog: (logId: string) => void;
  addVerifiedRun: (id: string, wpm: number, accuracy: number, trustScore: number) => void;
  updateMetrics: (newMetrics: Partial<SecurityMetrics>) => void;
  resetSecurityStore: () => void;
}

const defaultMetrics: SecurityMetrics = {
  activeUsers: 342,
  humanVerificationRate: 98.4,
  botDetectionRate: 99.8,
  fraudAttempts: 24,
  suspiciousAccounts: 7,
  blockedDevicesCount: 5,
  blockedIpsCount: 12,
};

const initialThreatLogs: ThreatEvent[] = [
  {
    id: 't-1',
    timestamp: Date.now() - 3600000 * 4,
    type: 'Bot Registration Blocked',
    description: 'Disposable email domain detected from datacenter IP (temp-mail.org)',
    riskScore: 18,
    username: 'anonymous-bot-33',
    ip: '104.244.75.12',
    deviceId: 'dev-unknown-88',
    status: 'blocked',
  },
  {
    id: 't-2',
    timestamp: Date.now() - 3600000 * 2,
    type: 'Macro User Flagged',
    description: 'Keystroke hold duration standard deviation < 3ms (unrealistic consistency)',
    riskScore: 24,
    username: 'cheater_pro',
    ip: '185.220.101.44',
    deviceId: 'dev-9a4f8821',
    status: 'flagged',
  },
  {
    id: 't-3',
    timestamp: Date.now() - 1800000,
    type: 'Suspicious WPM Spike',
    description: 'WPM grew from 95 to 280 in consecutive sessions (+194% delta)',
    riskScore: 32,
    username: 'kartik_test',
    ip: '157.44.112.98',
    deviceId: 'dev-f3c498a1',
    status: 'flagged',
  },
  {
    id: 't-4',
    timestamp: Date.now() - 600000,
    type: 'Account Takeover Attempt',
    description: 'Impossible travel detected: Login within 5 mins from Mumbai and Frankfurt',
    riskScore: 12,
    username: 'typer_king',
    ip: '45.132.224.18',
    deviceId: 'dev-992a8321',
    status: 'blocked',
  },
];

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      blockedIps: ['104.244.75.12', '45.132.224.18', '198.51.100.5'],
      blockedDevices: ['dev-unknown-88', 'dev-992a8321'],
      suspendedUsers: ['bot-spammer-9', 'malicious_macro'],
      threatLogs: initialThreatLogs,
      verifiedRuns: {},
      metrics: defaultMetrics,

      blockIp: (ip) => set((state) => {
        if (state.blockedIps.includes(ip)) return {};
        const newBlocked = [...state.blockedIps, ip];
        return {
          blockedIps: newBlocked,
          metrics: {
            ...state.metrics,
            blockedIpsCount: newBlocked.length,
            fraudAttempts: state.metrics.fraudAttempts + 1
          }
        };
      }),

      unblockIp: (ip) => set((state) => {
        const newBlocked = state.blockedIps.filter((item) => item !== ip);
        return {
          blockedIps: newBlocked,
          metrics: {
            ...state.metrics,
            blockedIpsCount: newBlocked.length
          }
        };
      }),

      blockDevice: (deviceId) => set((state) => {
        if (state.blockedDevices.includes(deviceId)) return {};
        const newBlocked = [...state.blockedDevices, deviceId];
        return {
          blockedDevices: newBlocked,
          metrics: {
            ...state.metrics,
            blockedDevicesCount: newBlocked.length,
            fraudAttempts: state.metrics.fraudAttempts + 1
          }
        };
      }),

      unblockDevice: (deviceId) => set((state) => {
        const newBlocked = state.blockedDevices.filter((item) => item !== deviceId);
        return {
          blockedDevices: newBlocked,
          metrics: {
            ...state.metrics,
            blockedDevicesCount: newBlocked.length
          }
        };
      }),

      suspendUser: (username) => set((state) => {
        if (state.suspendedUsers.includes(username)) return {};
        const newSuspended = [...state.suspendedUsers, username];
        return {
          suspendedUsers: newSuspended,
          metrics: {
            ...state.metrics,
            suspiciousAccounts: Math.max(0, state.metrics.suspiciousAccounts - 1)
          }
        };
      }),

      unsuspendUser: (username) => set((state) => {
        const newSuspended = state.suspendedUsers.filter((item) => item !== username);
        return {
          suspendedUsers: newSuspended
        };
      }),

      addThreatLog: (type, description, riskScore, username = 'guest', ip = '127.0.0.1', deviceId = 'local-dev') =>
        set((state) => {
          const newLog: ThreatEvent = {
            id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: Date.now(),
            type,
            description,
            riskScore,
            username,
            ip,
            deviceId,
            status: riskScore <= 20 ? 'blocked' : 'flagged',
          };
          const logs = [newLog, ...state.threatLogs].slice(0, 100);
          
          let fraudIncrement = 0;
          let suspIncrement = 0;
          if (riskScore <= 50) fraudIncrement = 1;
          if (riskScore > 20 && riskScore <= 50) suspIncrement = 1;

          return {
            threatLogs: logs,
            metrics: {
              ...state.metrics,
              fraudAttempts: state.metrics.fraudAttempts + fraudIncrement,
              suspiciousAccounts: state.metrics.suspiciousAccounts + suspIncrement,
            }
          };
        }),

      resolveThreatLog: (logId) =>
        set((state) => ({
          threatLogs: state.threatLogs.map((log) =>
            log.id === logId ? { ...log, status: 'resolved' } : log
          ),
          metrics: {
            ...state.metrics,
            suspiciousAccounts: Math.max(0, state.metrics.suspiciousAccounts - 1),
          }
        })),

      addVerifiedRun: (id, wpm, accuracy, trustScore) =>
        set((state) => ({
          verifiedRuns: {
            ...state.verifiedRuns,
            [id]: { wpm, accuracy, trustScore, timestamp: Date.now() },
          },
        })),

      updateMetrics: (newMetrics) =>
        set((state) => ({
          metrics: { ...state.metrics, ...newMetrics },
        })),

      resetSecurityStore: () =>
        set({
          blockedIps: ['104.244.75.12', '45.132.224.18', '198.51.100.5'],
          blockedDevices: ['dev-unknown-88', 'dev-992a8321'],
          suspendedUsers: ['bot-spammer-9', 'malicious_macro'],
          threatLogs: initialThreatLogs,
          verifiedRuns: {},
          metrics: defaultMetrics,
        }),
    }),
    {
      name: 'master-typing-security-storage',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
