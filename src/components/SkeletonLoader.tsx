import { useTheme } from '../contexts/ThemeContext';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div
      className={`animate-pulse rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'} ${className}`}
    />
  );
}

export function SkeletonCard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg space-y-4`}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg space-y-3`}>
      <Skeleton className="h-5 w-1/4 mb-6" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCharts() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {[1, 2].map((i) => (
        <div key={i} className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg`}>
          <Skeleton className="h-5 w-1/3 mb-4" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
