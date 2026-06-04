import { ChevronRight, Home } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onHome?: () => void;
}

export function Breadcrumbs({ items, onHome }: BreadcrumbsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <nav className="flex items-center gap-1 text-sm mb-6 flex-wrap">
      <button
        onClick={onHome}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition ${
          isDark
            ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        <Home className="w-4 h-4" />
      </button>

      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
          {index === items.length - 1 ? (
            <span className={`px-2 py-1 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className={`px-2 py-1 rounded-lg transition ${
                isDark
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}
