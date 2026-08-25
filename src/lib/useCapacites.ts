import { useCallback, useEffect, useState } from 'react';
import { fetchCapacites, type Capacite } from './capacitesSource';

// Aucune donnée de secours embarquée : la seule liste affichée doit venir du
// gsheet "unodex-meta" en direct. Si le fetch échoue, on affiche une erreur
// plutôt que de substituer un ancien instantané figé.
export function useCapacites() {
  const [capacites, setCapacites] = useState<Capacite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchCapacites()
      .then((data) => {
        if (cancelled) return;
        setCapacites(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCapacites([]);
        setError(err instanceof Error ? err.message : 'Erreur inconnue lors du chargement du gsheet.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

  return { capacites, loading, error, retry };
}
