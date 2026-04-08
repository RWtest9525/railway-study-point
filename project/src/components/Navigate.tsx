import { useEffect } from 'react';
import { useRouter } from '../contexts/RouterContext';

interface NavigateProps {
  to: string;
}

export function Navigate({ to }: NavigateProps) {
  const { navigate } = useRouter();

  useEffect(() => {
    navigate(to);
  }, [to, navigate]);

  return null;
}
