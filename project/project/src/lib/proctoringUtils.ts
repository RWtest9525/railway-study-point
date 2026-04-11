/**
 * Proctoring utilities for exam security
 * - Tab switch detection
 * - Device info tracking
 * - IP tracking
 * - Screen recording detection
 * - Copy-paste prevention
 */

export interface ProctoringEvent {
  type: 'tab_switch' | 'blur' | 'focus' | 'fullscreen_exit' | 'copy' | 'paste' | 'screenshot';
  timestamp: string;
  details?: any;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  screenResolution: string;
  language: string;
  userAgent: string;
  cores: number;
  memory?: number;
}

export interface ProctoringConfig {
  allowTabSwitch: boolean;
  maxTabSwitches: number;
  warnOnTabSwitch: boolean;
  autoSubmitOnViolation: boolean;
  allowCopyPaste: boolean;
  requireFullscreen: boolean;
  trackIP: boolean;
}

const DEFAULT_CONFIG: ProctoringConfig = {
  allowTabSwitch: false,
  maxTabSwitches: 3,
  warnOnTabSwitch: true,
  autoSubmitOnViolation: false,
  allowCopyPaste: false,
  requireFullscreen: false,
  trackIP: true,
};

/**
 * Get comprehensive device information
 */
export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  
  // Detect device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    if (/iPad|Android(?!.*Mobile)/i.test(ua)) {
      deviceType = 'tablet';
    } else {
      deviceType = 'mobile';
    }
  }
  
  // Detect browser
  let browser = 'Unknown';
  let browserVersion = '';
  
  if (/Chrome|Chromium/i.test(ua) && !/Edg|OPR/i.test(ua)) {
    browser = 'Chrome';
    browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || '';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
    browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || '';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
    browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || '';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
    browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || '';
  } else if (/OPR/i.test(ua)) {
    browser = 'Opera';
    browserVersion = ua.match(/OPR\/([\d.]+)/)?.[1] || '';
  }
  
  // Detect OS
  let os = 'Unknown';
  let osVersion = '';
  
  if (/Windows/i.test(ua)) {
    os = 'Windows';
    osVersion = ua.match(/Windows NT ([\d.]+)/)?.[1] || '';
  } else if (/Mac OS X/i.test(ua)) {
    os = 'macOS';
    osVersion = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    osVersion = ua.match(/Android ([\d.]+)/)?.[1] || '';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS';
    osVersion = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }
  
  return {
    type: deviceType,
    browser,
    browserVersion,
    os,
    osVersion,
    screenResolution: `${screen.width}x${screen.height}`,
    language: navigator.language,
    userAgent: ua,
    cores: navigator.hardwareConcurrency || 1,
    memory: (navigator as any).deviceMemory,
  };
}

/**
 * Get user's IP address (using external service)
 */
export async function getUserIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP address:', error);
    return 'unknown';
  }
}

/**
 * Start proctoring monitoring
 * Returns a function to stop monitoring and get events
 */
export function startProctoring(
  config: Partial<ProctoringConfig> = {},
  onViolation?: (event: ProctoringEvent) => void
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const events: ProctoringEvent[] = [];
  let tabSwitchCount = 0;
  let isMonitoring = true;
  
  const handleVisibilityChange = () => {
    if (!isMonitoring) return;
    
    if (document.hidden) {
      tabSwitchCount++;
      const event: ProctoringEvent = {
        type: 'tab_switch',
        timestamp: new Date().toISOString(),
        details: { count: tabSwitchCount },
      };
      events.push(event);
      
      if (onViolation) {
        onViolation(event);
      }
      
      if (!finalConfig.allowTabSwitch && finalConfig.warnOnTabSwitch) {
        alert(`Warning: Tab switching is not allowed! (${tabSwitchCount}/${finalConfig.maxTabSwitches})`);
      }
      
      if (tabSwitchCount >= finalConfig.maxTabSwitches && finalConfig.autoSubmitOnViolation) {
        // Auto-submit would be triggered here
        console.warn('Max tab switches reached - auto-submit triggered');
      }
    }
  };
  
  const handleBlur = () => {
    if (!isMonitoring) return;
    
    const event: ProctoringEvent = {
      type: 'blur',
      timestamp: new Date().toISOString(),
    };
    events.push(event);
  };
  
  const handleFocus = () => {
    if (!isMonitoring) return;
    
    const event: ProctoringEvent = {
      type: 'focus',
      timestamp: new Date().toISOString(),
    };
    events.push(event);
  };
  
  const handleFullscreenChange = () => {
    if (!isMonitoring || !finalConfig.requireFullscreen) return;
    
    if (!document.fullscreenElement) {
      const event: ProctoringEvent = {
        type: 'fullscreen_exit',
        timestamp: new Date().toISOString(),
      };
      events.push(event);
      
      if (onViolation) {
        onViolation(event);
      }
    }
  };
  
  const handleCopy = (e: ClipboardEvent) => {
    if (!isMonitoring || finalConfig.allowCopyPaste) return;
    
    e.preventDefault();
    const event: ProctoringEvent = {
      type: 'copy',
      timestamp: new Date().toISOString(),
    };
    events.push(event);
    
    if (onViolation) {
      onViolation(event);
    }
  };
  
  const handlePaste = (e: ClipboardEvent) => {
    if (!isMonitoring || finalConfig.allowCopyPaste) return;
    
    e.preventDefault();
    const event: ProctoringEvent = {
      type: 'paste',
      timestamp: new Date().toISOString(),
    };
    events.push(event);
    
    if (onViolation) {
      onViolation(event);
    }
  };
  
  const handleContextMenu = (e: MouseEvent) => {
    if (!isMonitoring || finalConfig.allowCopyPaste) return;
    
    e.preventDefault();
  };
  
  // Add event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);
  window.addEventListener('focus', handleFocus);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('copy', handleCopy, true);
  document.addEventListener('paste', handlePaste, true);
  document.addEventListener('contextmenu', handleContextMenu);
  
  // Prevent keyboard shortcuts for copy/paste
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isMonitoring || finalConfig.allowCopyPaste) return;
    
    // Ctrl+C, Ctrl+X, Ctrl+V
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
    
    // F12 (developer tools)
    if (e.key === 'F12') {
      e.preventDefault();
    }
    
    // Ctrl+Shift+I (inspect element)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
    }
    
    // Ctrl+U (view source)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
    }
    
    // Print Screen
    if (e.key === 'PrintScreen') {
      const event: ProctoringEvent = {
        type: 'screenshot',
        timestamp: new Date().toISOString(),
      };
      events.push(event);
    }
  };
  
  document.addEventListener('keydown', handleKeyDown, true);
  
  // Return stop function
  return {
    stop: () => {
      isMonitoring = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, true);
    },
    getEvents: () => [...events],
    getTabSwitchCount: () => tabSwitchCount,
  };
}

/**
 * Check if browser supports required proctoring features
 */
export function checkProctoringSupport(): { supported: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (!navigator.clipboard) {
    warnings.push('Clipboard API not available - copy/paste prevention may not work');
  }
  
  if (!document.fullscreenEnabled) {
    warnings.push('Fullscreen API not available - fullscreen requirement cannot be enforced');
  }
  
  return {
    supported: warnings.length === 0,
    warnings,
  };
}

/**
 * Detect if user is using mobile data (vs WiFi)
 */
export async function detectConnectionType(): Promise<'cellular' | 'wifi' | 'ethernet' | 'unknown'> {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) {
    return 'unknown';
  }
  
  if (connection.effectiveType) {
    if (['slow-2g', '2g', '3g', '4g'].includes(connection.effectiveType)) {
      return 'cellular';
    }
  }
  
  return 'unknown';
}

/**
 * Log proctoring data to Firestore
 */
export async function logProctoringData(
  attemptId: string,
  userId: string,
  events: ProctoringEvent[],
  deviceInfo: DeviceInfo,
  ipAddress: string
): Promise<void> {
  const { collection, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const { db } = await import('./firebase');
  
  const proctoringRef = doc(collection(db, 'proctoring_logs'), attemptId);
  
  await setDoc(proctoringRef, {
    attempt_id: attemptId,
    user_id: userId,
    device_info: deviceInfo,
    ip_address: ipAddress,
    events,
    tab_switch_count: events.filter(e => e.type === 'tab_switch').length,
    violation_count: events.length,
    created_at: serverTimestamp(),
  });
}

/**
 * Generate proctoring report
 */
export function generateProctoringReport(events: ProctoringEvent[]): {
  totalEvents: number;
  tabSwitches: number;
  copyAttempts: number;
  pasteAttempts: number;
  fullscreenExits: number;
  screenshots: number;
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
} {
  const tabSwitches = events.filter(e => e.type === 'tab_switch').length;
  const copyAttempts = events.filter(e => e.type === 'copy').length;
  const pasteAttempts = events.filter(e => e.type === 'paste').length;
  const fullscreenExits = events.filter(e => e.type === 'fullscreen_exit').length;
  const screenshots = events.filter(e => e.type === 'screenshot').length;
  
  // Calculate risk level
  let riskScore = 0;
  riskScore += tabSwitches * 3;
  riskScore += copyAttempts * 2;
  riskScore += pasteAttempts * 2;
  riskScore += fullscreenExits * 1;
  riskScore += screenshots * 1;
  
  let riskLevel: 'low' | 'medium' | 'high';
  if (riskScore <= 3) {
    riskLevel = 'low';
  } else if (riskScore <= 10) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }
  
  return {
    totalEvents: events.length,
    tabSwitches,
    copyAttempts,
    pasteAttempts,
    fullscreenExits,
    screenshots,
    riskLevel,
    summary: `Detected ${events.length} suspicious activities during the exam.`,
  };
}