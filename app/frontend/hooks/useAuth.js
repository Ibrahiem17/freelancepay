import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

// bs58 is ESM — imported via dynamic import in encode helper below
async function encodeBase58(bytes) {
  const bs58 = (await import("bs58")).default;
  return bs58.encode(bytes);
}

export default function useAuth() {
  const { publicKey, signMessage, connected } = useWallet();
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error,     setError]     = useState(null);

  // Restore session from cookie on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(
    async (walletAddress, signMessageFn) => {
      setSigningIn(true);
      try {
        setError(null);

        // Step 1: get challenge message
        const challengeRes = await fetch(
          `/api/auth/challenge?wallet=${walletAddress}`
        );
        if (!challengeRes.ok) {
          const { error: e } = await challengeRes.json();
          throw new Error(e || "Failed to get challenge");
        }
        const { message, nonce } = await challengeRes.json();

        // Step 2: sign with Phantom
        const msgBytes = new TextEncoder().encode(message);
        const signatureBytes = await signMessageFn(msgBytes);

        // Step 3: encode signature to base58
        const signatureBase58 = await encodeBase58(signatureBytes);

        // Step 4: verify on server
        const verifyRes = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: walletAddress, signatureBase58, nonce }),
        });

        if (!verifyRes.ok) {
          const { error: e } = await verifyRes.json();
          throw new Error(e || "Verification failed");
        }

        const { user: userData } = await verifyRes.json();
        setUser(userData);
        return { success: true };
      } catch (err) {
        const msg = err.message || "Sign-in failed";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setSigningIn(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const r = await fetch("/api/auth/me");
    if (r.ok) {
      const data = await r.json();
      if (data?.user) setUser(data.user);
    }
  }, []);

  // Auto sign-in when wallet connects (or when loading finishes with wallet already connected).
  // Auto sign-out when wallet disconnects.
  useEffect(() => {
    if (connected && publicKey && !user && !loading && !signingIn && signMessage) {
      signIn(publicKey.toBase58(), signMessage);
    }
    if (!connected && user) {
      signOut();
    }
  }, [connected, publicKey, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    user,
    loading,
    signingIn,
    error,
    signIn,
    signOut,
    refreshUser,
    isAuthenticated: !!user,
  };
}
