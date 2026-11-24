import { useState, useEffect, useCallback } from 'react';
import { healthApi } from '../../../shared/api/healthApi';
import { SystemHealth } from '../../../shared/types/system';

export function useSystemHealth(pollIntervalMs = 15000) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsChecking(true);
      const data = await healthApi.check();
      setHealth(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to reach health endpoint');
    } finally {
      if (showLoading) setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth(true);
    const interval = setInterval(() => checkHealth(false), pollIntervalMs);
    return () => clearInterval(interval);
  }, [checkHealth, pollIntervalMs]);

  return { health, isChecking, error, refresh: () => checkHealth(true) };
}
