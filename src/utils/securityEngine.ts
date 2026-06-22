/**
 * Enterprise-grade client-side security engine for Master Typing Pro.
 *
 * This module intentionally uses deterministic browser heuristics and mockable
 * reputation checks. Production deployments should back these reports with
 * Firebase App Check, reCAPTCHA Enterprise, server-side IP intelligence, and
 * Cloud Functions validation before accepting leaderboard scores.
 */

const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "yopmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "10minutemail.com",
  "sharklasers.com",
  "getairmail.com",
  "dispostable.com",
  "burnermail.io",
  "trashmail.com",
];

const VPN_DATACENTER_IP_PREFIXES = [
  "104.244.",
  "185.220.",
  "45.132.",
  "198.51.",
  "192.0.2.",
  "203.0.113.",
];

const ABUSIVE_USERNAME_PATTERNS = [
  /admin/i,
  /support/i,
  /moderator/i,
  /official/i,
  /system/i,
  /bot/i,
  /script/i,
  /cheat/i,
  /hack/i,
];

const AUTOMATION_GLOBALS = [
  "__webdriver_evaluate",
  "__selenium_evaluate",
  "__webdriver_script_function",
  "__webdriver_script_func",
  "__webdriver_script_fn",
  "__fxdriver_evaluate",
  "__driver_unwrapped",
  "__webdriver_unwrapped",
  "__selenium_unwrapped",
  "__fxdriver_unwrapped",
  "_phantom",
  "callPhantom",
  "_selenium",
  "domAutomation",
  "domAutomationController",
  "cdc_adoQpoasnfa76pfcZLmcfl_Array",
  "playwright",
];

export type RiskCategory = "Critical" | "High" | "Medium" | "Trusted";
export type SecurityAction = "block" | "captcha" | "verify_email" | "monitor" | "allow";
export type DeviceReputation = "trusted" | "known" | "unknown" | "suspicious" | "blocked";

export interface SecuritySessionData {
  holdDurations: number[];
  flightTimes: number[];
  tabSwitches: number;
  mousePoints: { x: number; y: number; t: number }[];
  totalKeys: number;
  backspaces: number;
  errors: number;
  elapsedMs: number;
  wpm?: number;
  accuracy?: number;
  previousBestWpm?: number;
}

export interface BrowserIntegrityReport {
  webdriverDetected: boolean;
  headlessDetected: boolean;
  devtoolsOpen: boolean;
  automationGlobals: string[];
  extensionRisk: boolean;
  summary: string;
}

export interface NetworkReputationReport {
  isVPN: boolean;
  isTor: boolean;
  isHosting: boolean;
  reputation: "residential" | "datacenter_proxy" | "tor_exit" | "unknown";
  riskScore: number;
}

export interface SecurityScoreReport {
  score: number;
  category: RiskCategory;
  action: SecurityAction;
  reasons: string[];
  fingerprint: string;
  isBot: boolean;
  verified: boolean;
  leaderboardEligible: boolean;
  riskTags: string[];
  details: {
    fingerprintRep: string;
    deviceRep: DeviceReputation;
    biometricsRep: string;
    browserRep: string;
    networkRep: string;
    action: SecurityAction;
    fraudProbability: number;
  };
}

export interface RegistrationRiskInput {
  email: string;
  username: string;
  ip: string;
  deviceFingerprint?: string;
  recentAttempts?: number;
  country?: string;
  expectedCountry?: string;
}

export interface LoginRiskInput {
  ip: string;
  failedAttempts: number;
  deviceChanged?: boolean;
  locationChanged?: boolean;
  impossibleTravel?: boolean;
  credentialStuffingSignal?: boolean;
  passwordSpraySignal?: boolean;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getRiskCategory(score: number): RiskCategory {
  if (score <= 25) return "Critical";
  if (score <= 50) return "High";
  if (score <= 75) return "Medium";
  return "Trusted";
}

export function getSecurityAction(score: number): SecurityAction {
  if (score <= 20) return "block";
  if (score <= 40) return "captcha";
  if (score <= 60) return "verify_email";
  if (score <= 80) return "monitor";
  return "allow";
}

export function isScoreLeaderboardEligible(score: number, accuracy: number): boolean {
  return score >= 76 && accuracy >= 95;
}

function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash).toString(16);
}

/**
 * Computes a stable browser device fingerprint from low-cost browser signals.
 */
export function generateDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server-fingerprint";

  try {
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const languages = navigator.languages ? navigator.languages.join(",") : navigator.language || "";
    const userAgent = navigator.userAgent;

    let gpuInfo = "";
    try {
      const canvas = document.createElement("canvas");
      const gl = (canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
      const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
      if (gl && debugInfo) {
        gpuInfo = [
          gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
          gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
        ].join("_");
      }
    } catch {
      gpuInfo = "gpu-blocked";
    }

    let canvasHash = "";
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "alphabetic";
        ctx.font = "14px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("TypingPro-Security-Engine", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("TypingPro-Security-Engine", 4, 17);
        canvasHash = hashString(canvas.toDataURL());
      }
    } catch {
      canvasHash = "canvas-blocked";
    }

    return `fp-${hashString([screenInfo, timezone, languages, userAgent, gpuInfo, canvasHash].join("|"))}`;
  } catch {
    return `fp-fallback-${Date.now()}`;
  }
}

export function isDisposableEmail(email: string): boolean {
  const parts = email.split("@");
  if (parts.length < 2) return true;
  const domain = parts[1].trim().toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
}

export function checkNetworkReputation(ip: string): NetworkReputationReport {
  const normalizedIp = ip.trim();
  const isTor = normalizedIp.startsWith("185.220.");
  const isHosting = VPN_DATACENTER_IP_PREFIXES.some((prefix) => normalizedIp.startsWith(prefix));
  const isVPN = isTor || isHosting;

  return {
    isVPN,
    isTor,
    isHosting,
    reputation: isTor ? "tor_exit" : isHosting ? "datacenter_proxy" : normalizedIp ? "residential" : "unknown",
    riskScore: isTor ? 90 : isHosting ? 75 : normalizedIp ? 10 : 40,
  };
}

export function classifyDeviceReputation(
  fingerprint: string,
  blockedDevices: string[] = [],
  knownDevices: string[] = []
): DeviceReputation {
  if (blockedDevices.includes(fingerprint)) return "blocked";
  if (knownDevices.includes(fingerprint)) return "trusted";
  if (fingerprint.includes("fallback") || fingerprint.includes("blocked")) return "suspicious";
  if (fingerprint === "server-fingerprint") return "unknown";
  return "known";
}

export function detectBrowserIntegrity(): BrowserIntegrityReport {
  if (typeof window === "undefined") {
    return {
      webdriverDetected: false,
      headlessDetected: false,
      devtoolsOpen: false,
      automationGlobals: [],
      extensionRisk: false,
      summary: "Server render environment",
    };
  }

  const nav = navigator as Navigator & { webdriver?: boolean; userAgentData?: { brands?: { brand: string }[] } };
  const win = (window as unknown) as Window & Record<string, unknown>;
  const userAgent = nav.userAgent || "";
  const brands = nav.userAgentData?.brands?.map((brand) => brand.brand).join(" ") || "";
  const webdriverDetected = Boolean(nav.webdriver);
  const headlessDetected =
    /HeadlessChrome|PhantomJS|SlimerJS|Nightmare|ElectronHeadless/i.test(userAgent) ||
    /Headless/i.test(brands) ||
    ((!navigator.languages || navigator.languages.length === 0) &&
      (!navigator.plugins || navigator.plugins.length === 0) &&
      !/Android|iPhone|iPad/i.test(userAgent));
  const devtoolsOpen =
    window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160;
  const automationGlobals = AUTOMATION_GLOBALS.filter((key) => key in win);
  const extensionRisk =
    typeof document !== "undefined" &&
    Boolean(document.documentElement.getAttribute("webdriver") || document.documentElement.getAttribute("selenium"));

  return {
    webdriverDetected,
    headlessDetected,
    devtoolsOpen,
    automationGlobals,
    extensionRisk,
    summary: `Webdriver: ${webdriverDetected}, Headless: ${headlessDetected}, DevTools: ${devtoolsOpen}, Automation globals: ${automationGlobals.length}`,
  };
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 100;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function maxFrequencyRatio(values: number[]): number {
  if (values.length === 0) return 0;
  const frequencies = values.reduce<Record<number, number>>((acc, value) => {
    const bucket = Math.round(value / 5) * 5;
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
  return Math.max(...Object.values(frequencies)) / values.length;
}

function analyzeTypingBiometrics(sessionData: SecuritySessionData) {
  const reasons: string[] = [];
  const tags: string[] = [];
  let penalty = 0;

  const holdStdDev = calculateStandardDeviation(sessionData.holdDurations);
  const flightStdDev = calculateStandardDeviation(sessionData.flightTimes);
  const holdRepeatRatio = maxFrequencyRatio(sessionData.holdDurations);
  const flightRepeatRatio = maxFrequencyRatio(sessionData.flightTimes);

  if (sessionData.totalKeys >= 12) {
    if (holdStdDev < 12) {
      penalty += 35;
      tags.push("keystroke-hold-uniformity");
      reasons.push(`Perfect hold duration consistency detected (hold SD: ${holdStdDev.toFixed(1)}ms)`);
    }

    if (flightStdDev < 12) {
      penalty += 35;
      tags.push("keystroke-flight-uniformity");
      reasons.push(`Perfect flight interval consistency detected (flight SD: ${flightStdDev.toFixed(1)}ms)`);
    }

    if (holdRepeatRatio > 0.6 || flightRepeatRatio > 0.6) {
      penalty += 25;
      tags.push("repeated-keystroke-buckets");
      reasons.push("Highly repetitive keystroke timing buckets flagged");
    }
  }

  const wpm =
    sessionData.wpm ??
    (sessionData.elapsedMs > 0 ? (sessionData.totalKeys / 5) / (sessionData.elapsedMs / 60000) : 0);
  const accuracy = sessionData.accuracy ?? 100;

  if (wpm > 240) {
    penalty += 30;
    tags.push("physically-anomalous-speed");
    reasons.push(`Physically anomalous typing speed calculated: ${Math.round(wpm)} WPM`);
  }

  if (sessionData.previousBestWpm && wpm > sessionData.previousBestWpm + 45 && wpm > sessionData.previousBestWpm * 1.6) {
    penalty += 28;
    tags.push("historical-wpm-spike");
    reasons.push(`WPM spike from previous best ${sessionData.previousBestWpm} to ${Math.round(wpm)} detected`);
  }

  if (wpm > 110 && accuracy >= 99.5 && sessionData.errors === 0 && sessionData.backspaces === 0) {
    penalty += 18;
    tags.push("perfect-high-speed-run");
    reasons.push("High-speed run completed with no errors or correction behavior");
  }

  if (sessionData.elapsedMs < 5000 && sessionData.totalKeys > 30) {
    penalty += 20;
    tags.push("short-session-anomaly");
    reasons.push("Session duration is too short for the amount of submitted typing");
  }

  return {
    penalty,
    reasons,
    tags,
    summary: `Hold SD: ${holdStdDev.toFixed(1)}ms, Flight SD: ${flightStdDev.toFixed(1)}ms, Hold repeat: ${Math.round(
      holdRepeatRatio * 100
    )}%, Flight repeat: ${Math.round(flightRepeatRatio * 100)}%`,
  };
}

function analyzeHumanInteraction(sessionData: SecuritySessionData) {
  const reasons: string[] = [];
  const tags: string[] = [];
  let penalty = 0;
  const wpm =
    sessionData.wpm ??
    (sessionData.elapsedMs > 0 ? (sessionData.totalKeys / 5) / (sessionData.elapsedMs / 60000) : 0);

  if (sessionData.tabSwitches > 3) {
    penalty += Math.min(25, sessionData.tabSwitches * 5);
    tags.push("focus-switching");
    reasons.push(`Suspicious background focus shifts: ${sessionData.tabSwitches} window switches`);
  }

  if (wpm > 85 && sessionData.mousePoints.length === 0) {
    penalty += 15;
    tags.push("zero-pointer-interaction");
    reasons.push("Typing test completed with zero pointer interaction");
  }

  if (sessionData.mousePoints.length >= 8) {
    let directionChanges = 0;
    let previousAngle: number | null = null;
    for (let i = 1; i < sessionData.mousePoints.length; i += 1) {
      const prev = sessionData.mousePoints[i - 1];
      const curr = sessionData.mousePoints[i];
      const angle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      if (previousAngle !== null && Math.abs(angle - previousAngle) > 0.35) {
        directionChanges += 1;
      }
      previousAngle = angle;
    }

    if (directionChanges <= 1 && sessionData.mousePoints.length > 20) {
      penalty += 10;
      tags.push("linear-pointer-path");
      reasons.push("Pointer movement path appears unnaturally linear");
    }
  }

  return { penalty, reasons, tags };
}

function createReport(params: {
  score: number;
  fingerprint: string;
  reasons: string[];
  riskTags: string[];
  deviceRep: DeviceReputation;
  biometricsRep: string;
  browserRep: string;
  networkRep: string;
  accuracy?: number;
}): SecurityScoreReport {
  const score = clampScore(params.score);
  const category = getRiskCategory(score);
  const action = getSecurityAction(score);
  const isBot = score <= 50 || params.riskTags.some((tag) => tag.includes("webdriver") || tag.includes("headless"));
  const accuracy = params.accuracy ?? 100;
  const verified = score >= 76 && !isBot;

  return {
    score,
    category,
    action,
    reasons: params.reasons.length > 0 ? params.reasons : ["No high-risk indicators found"],
    fingerprint: params.fingerprint,
    isBot,
    verified,
    leaderboardEligible: verified && isScoreLeaderboardEligible(score, accuracy),
    riskTags: params.riskTags,
    details: {
      fingerprintRep: params.fingerprint,
      deviceRep: params.deviceRep,
      biometricsRep: params.biometricsRep,
      browserRep: params.browserRep,
      networkRep: params.networkRep,
      action,
      fraudProbability: clampScore(100 - score),
    },
  };
}

export function evaluateSessionSecurity(
  sessionData: SecuritySessionData,
  username: string,
  ip: string
): SecurityScoreReport {
  const reasons: string[] = [];
  const riskTags: string[] = [];
  let score = 100;

  const fingerprint = generateDeviceFingerprint();
  const deviceRep = classifyDeviceReputation(fingerprint);
  const browser = detectBrowserIntegrity();
  const network = checkNetworkReputation(ip);
  const biometrics = analyzeTypingBiometrics(sessionData);
  const interaction = analyzeHumanInteraction(sessionData);

  if (browser.webdriverDetected) {
    score -= 40;
    riskTags.push("webdriver-detected");
    reasons.push("Browser automation framework flag detected");
  }

  if (browser.headlessDetected) {
    score -= 40;
    riskTags.push("headless-browser");
    reasons.push("Headless browser environment signatures identified");
  }

  if (browser.devtoolsOpen) {
    score -= 15;
    riskTags.push("devtools-open");
    reasons.push("Developer tools workspace overlay detected");
  }

  if (browser.automationGlobals.length > 0) {
    score -= 35;
    riskTags.push("automation-globals");
    reasons.push(`Automation globals detected: ${browser.automationGlobals.slice(0, 3).join(", ")}`);
  }

  if (browser.extensionRisk) {
    score -= 20;
    riskTags.push("extension-dom-injection");
    reasons.push("Automation-related DOM attributes were detected");
  }

  if (network.isVPN) {
    score -= network.isTor ? 25 : 15;
    riskTags.push(network.isTor ? "tor-network" : "datacenter-proxy");
    reasons.push("Datacenter, proxy, or Tor network reputation detected");
  }

  if (ABUSIVE_USERNAME_PATTERNS.some((pattern) => pattern.test(username || ""))) {
    score -= 10;
    riskTags.push("username-abuse-pattern");
    reasons.push("Username contains abuse-prone reserved terms");
  }

  score -= biometrics.penalty;
  score -= interaction.penalty;
  reasons.push(...biometrics.reasons, ...interaction.reasons);
  riskTags.push(...biometrics.tags, ...interaction.tags);

  return createReport({
    score,
    fingerprint,
    reasons,
    riskTags,
    deviceRep,
    biometricsRep: biometrics.summary,
    browserRep: browser.summary,
    networkRep: network.reputation,
    accuracy: sessionData.accuracy,
  });
}

export function evaluateRegistrationSecurity(input: RegistrationRiskInput): SecurityScoreReport {
  const reasons: string[] = [];
  const riskTags: string[] = [];
  let score = 100;

  const fingerprint = input.deviceFingerprint || generateDeviceFingerprint();
  const deviceRep = classifyDeviceReputation(fingerprint);
  const browser = detectBrowserIntegrity();
  const network = checkNetworkReputation(input.ip);

  if (isDisposableEmail(input.email)) {
    score -= 50;
    riskTags.push("disposable-email");
    reasons.push("Disposable email address domain");
  }

  const normalizedUsername = input.username.trim();
  if (normalizedUsername.length < 3) {
    score -= 20;
    riskTags.push("short-username");
    reasons.push("Username is too short for normal account creation");
  }

  if (ABUSIVE_USERNAME_PATTERNS.some((pattern) => pattern.test(normalizedUsername))) {
    score -= 25;
    riskTags.push("username-abuse-pattern");
    reasons.push("Username contains reserved or abuse-prone terms");
  }

  if (input.recentAttempts && input.recentAttempts >= 4) {
    score -= Math.min(35, input.recentAttempts * 7);
    riskTags.push("registration-rate-limit");
    reasons.push(`Registration attempt velocity is high (${input.recentAttempts} recent attempts)`);
  }

  if (network.isVPN) {
    score -= network.isTor ? 35 : 30;
    riskTags.push(network.isTor ? "tor-registration" : "proxy-registration");
    reasons.push("Network reputation indicates proxy, Tor, or datacenter origin");
  }

  if (browser.webdriverDetected || browser.headlessDetected || browser.automationGlobals.length > 0) {
    score -= 45;
    riskTags.push("automated-registration-browser");
    reasons.push("Automation browser signature detected during registration");
  }

  if (input.country && input.expectedCountry && input.country !== input.expectedCountry) {
    score -= 15;
    riskTags.push("country-anomaly");
    reasons.push(`Country anomaly detected (${input.country} vs expected ${input.expectedCountry})`);
  }

  return createReport({
    score,
    fingerprint,
    reasons,
    riskTags,
    deviceRep,
    biometricsRep: "Registration does not include typing biometrics",
    browserRep: browser.summary,
    networkRep: network.reputation,
    accuracy: 100,
  });
}

export function evaluateLoginSecurity(input: LoginRiskInput): SecurityScoreReport {
  const reasons: string[] = [];
  const riskTags: string[] = [];
  let score = 100;

  const fingerprint = generateDeviceFingerprint();
  const deviceRep = classifyDeviceReputation(fingerprint);
  const browser = detectBrowserIntegrity();
  const network = checkNetworkReputation(input.ip);

  if (input.failedAttempts >= 3) {
    score -= Math.min(35, input.failedAttempts * 8);
    riskTags.push("failed-login-velocity");
    reasons.push(`${input.failedAttempts} failed login attempts recorded`);
  }

  if (input.deviceChanged) {
    score -= 18;
    riskTags.push("device-change");
    reasons.push("Login attempt came from a new device fingerprint");
  }

  if (input.locationChanged) {
    score -= 15;
    riskTags.push("location-change");
    reasons.push("Login location changed from the last known session");
  }

  if (input.impossibleTravel) {
    score -= 45;
    riskTags.push("impossible-travel");
    reasons.push("Impossible travel pattern detected");
  }

  if (input.credentialStuffingSignal) {
    score -= 45;
    riskTags.push("credential-stuffing");
    reasons.push("Credential stuffing signal detected");
  }

  if (input.passwordSpraySignal) {
    score -= 35;
    riskTags.push("password-spraying");
    reasons.push("Password spraying pattern detected");
  }

  if (network.isVPN) {
    score -= 15;
    riskTags.push("login-proxy-network");
    reasons.push("Login network reputation indicates proxy or datacenter origin");
  }

  if (browser.webdriverDetected || browser.headlessDetected) {
    score -= 35;
    riskTags.push("automated-login-browser");
    reasons.push("Automation browser signature detected during login");
  }

  return createReport({
    score,
    fingerprint,
    reasons,
    riskTags,
    deviceRep,
    biometricsRep: "Login does not include typing biometrics",
    browserRep: browser.summary,
    networkRep: network.reputation,
    accuracy: 100,
  });
}
