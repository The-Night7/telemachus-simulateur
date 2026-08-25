import { useEffect, useState } from 'react';
import fallbackCapacites from '../capacites.json';
import { fetchCapacites, type Capacite } from './capacitesSource';

export function useCapacites() {
  const [capacites, setCapacites] = useState<Capacite[]>(fallbackCapacites as Capacite[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchCapacites()
      .then((data) => {
        if (cancelled) return;
        setCapacites(data);
        setIsLive(true);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erreur inconnue lors du chargement du gsheet.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { capacites, loading, error, isLive };
}
