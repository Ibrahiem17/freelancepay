import { useState, useEffect } from "react";

const CACHE_TTL = 60_000;
let _cache = { price: null, ts: 0 };

export default function useSolPrice() {
  const [price, setPrice] = useState(_cache.price);

  useEffect(() => {
    if (_cache.price && Date.now() - _cache.ts < CACHE_TTL) {
      setPrice(_cache.price);
      return;
    }
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const p = data?.solana?.usd;
        if (p) {
          _cache = { price: p, ts: Date.now() };
          setPrice(p);
        }
      })
      .catch(() => {});
  }, []);

  return price;
}
