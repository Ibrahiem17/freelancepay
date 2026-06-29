import { useState, useEffect, useRef } from "react";

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export default function useSolanaPrice() {
  const [priceUSD, setPriceUSD] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      const now = Date.now();
      if (now - lastFetchRef.current < CACHE_DURATION_MS && priceUSD !== null) return;

      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data = await res.json();
        if (!cancelled) {
          setPriceUSD(data?.solana?.usd ?? null);
          lastFetchRef.current = Date.now();
        }
      } catch {
        // Fail silently — USD display is optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, CACHE_DURATION_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const solToUSD = (solAmount) => {
    if (priceUSD === null || solAmount == null) return null;
    return (solAmount * priceUSD).toFixed(2);
  };

  return { priceUSD, loading, solToUSD };
}
