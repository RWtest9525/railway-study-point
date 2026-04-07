import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface RouterContextType {
  currentPath: string;
  navigate: (path: string) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

// Scroll position storage for each path
const scrollPositions = new Map<string, { x: number; y: number }>();

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const initialPathRef = useRef(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      const newPath = window.location.pathname;
      setCurrentPath(newPath);
      
      // Restore scroll position for this path
      const savedPosition = scrollPositions.get(newPath);
      if (savedPosition) {
        window.scrollTo(savedPosition.x, savedPosition.y);
      } else {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    // Save current scroll position before navigating
    scrollPositions.set(window.location.pathname, {
      x: window.scrollX,
      y: window.scrollY
    });

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      // Scroll to top for new pages
      window.scrollTo(0, 0);
    }
  }, []);

  const goBack = useCallback(() => {
    // Save current scroll position
    scrollPositions.set(window.location.pathname, {
      x: window.scrollX,
      y: window.scrollY
    });

    // Check if we're on a deep page (exam, results, etc.) - go back normally
    const deepPaths = ['/exam/', '/results/', '/profile', '/settings', '/leaderboard', '/upgrade', '/membership', '/support', '/notifications'];
    const isDeepPath = deepPaths.some(path => window.location.pathname.startsWith(path));
    
    if (isDeepPath) {
      // For deep pages, go back to previous page
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate('/dashboard');
      }
    } else {
      // For phone back button/gesture on non-deep pages, go to home/dashboard
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <RouterContext.Provider value={{ currentPath, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (context === undefined) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}