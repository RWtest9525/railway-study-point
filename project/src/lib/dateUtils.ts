/**
 * Date formatting utilities for the Pro Education Management System
 * Fixes "Invalid Date" issues by using Intl.DateTimeFormat and proper date handling
 */

/**
 * Format a date string or timestamp to a human-readable format
 * Handles Firebase timestamps, ISO strings, and Date objects
 */
export function formatDate(
  date: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided:', date);
      return '-';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    };
    
    return new Intl.DateTimeFormat('en-IN', defaultOptions).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

/**
 * Format date and time together
 */
export function formatDateTime(
  date: string | number | Date | null | undefined
): string {
  return formatDate(date, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Format date to relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: string | number | Date | null | undefined
): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
    
    if (isNaN(dateObj.getTime())) return '-';
    
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffSecs = Math.floor(Math.abs(diffMs) / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    const isPast = diffMs < 0;
    
    if (diffSecs < 60) {
      return isPast ? 'just now' : 'in a few seconds';
    } else if (diffMins < 60) {
      return isPast 
        ? `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago` 
        : `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return isPast 
        ? `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago` 
        : `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return isPast 
        ? `${diffDays} day${diffDays !== 1 ? 's' : ''} ago` 
        : `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffWeeks < 4) {
      return isPast 
        ? `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago` 
        : `in ${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}`;
    } else if (diffMonths < 12) {
      return isPast 
        ? `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago` 
        : `in ${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
    } else {
      return isPast 
        ? `${diffYears} year${diffYears !== 1 ? 's' : ''} ago` 
        : `in ${diffYears} year${diffYears !== 1 ? 's' : ''}`;
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return formatDate(date);
  }
}

/**
 * Check if a premium subscription is expiring soon (within N days)
 */
export function isExpiringSoon(
  expiryDate: string | number | Date | null | undefined,
  daysThreshold: number = 3
): boolean {
  if (!expiryDate) return false;
  
  try {
    const dateObj = typeof expiryDate === 'string' || typeof expiryDate === 'number'
      ? new Date(expiryDate)
      : expiryDate;
    
    if (isNaN(dateObj.getTime())) return false;
    
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    return dateObj <= thresholdDate && dateObj >= now;
  } catch (error) {
    console.error('Error checking expiry:', error);
    return false;
  }
}

/**
 * Get days remaining until a date
 */
export function getDaysRemaining(
  targetDate: string | number | Date | null | undefined
): number {
  if (!targetDate) return 0;
  
  try {
    const dateObj = typeof targetDate === 'string' || typeof targetDate === 'number'
      ? new Date(targetDate)
      : targetDate;
    
    if (isNaN(dateObj.getTime())) return 0;
    
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return 0;
  }
}

/**
 * Format duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0 || isNaN(seconds)) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Format time spent per question (for analytics)
 */
export function formatTimePerQuestion(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: string | number | Date | null | undefined): boolean {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
    
    if (isNaN(dateObj.getTime())) return false;
    
    return dateObj < new Date();
  } catch (error) {
    console.error('Error checking if date is past:', error);
    return false;
  }
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(date: string | number | Date | null | undefined): boolean {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
    
    if (isNaN(dateObj.getTime())) return false;
    
    return dateObj > new Date();
  } catch (error) {
    console.error('Error checking if date is future:', error);
    return false;
  }
}

/**
 * Get the start of day (midnight) for a given date
 */
export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of day (23:59:59) for a given date
 */
export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Format date range (e.g., "Jan 1 - Jan 7, 2024")
 */
export function formatDateRange(
  startDate: string | number | Date | null | undefined,
  endDate: string | number | Date | null | undefined
): string {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return '-';
  }
  
  const startStr = formatDate(start, { month: 'short', day: 'numeric' });
  const endStr = formatDate(end, { month: 'short', day: 'numeric', year: 'numeric' });
  
  return `${startStr} - ${endStr}`;
}

/**
 * Get month name from date
 */
export function getMonthName(date: string | number | Date | null | undefined): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
    
    if (isNaN(dateObj.getTime())) return '-';
    
    return new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(dateObj);
  } catch (error) {
    console.error('Error getting month name:', error);
    return '-';
  }
}

/**
 * Get financial year from date (India: April 1 - March 31)
 */
export function getFinancialYear(date: string | number | Date = new Date()): string {
  const dateObj = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;
  
  if (isNaN(dateObj.getTime())) return '-';
  
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth(); // 0-11
  
  // If month is Jan-March (0-2), financial year is previous year to current
  // If month is April-Dec (3-11), financial year is current year to next
  if (month < 3) {
    return `FY ${year - 1}-${year}`;
  } else {
    return `FY ${year}-${year + 1}`;
  }
}