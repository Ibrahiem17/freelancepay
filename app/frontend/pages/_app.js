import "@/styles/globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { createContext, useContext, useMemo, useEffect, useState, useCallback } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { Buffer } from "buffer";
import { Gaegu, Nunito, Inter, Space_Grotesk } from "next/font/google";
import { initTheme } from "@/utils/theme";
import useAuth from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import { NETWORKS, DEFAULT_NETWORK } from "@/lib/networkConfig";
import MainnetWarningModal from "@/components/MainnetWarningModal";

if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}

const gaegu = Gaegu({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const nunito = Nunito({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body-y2k",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display-y2k",
  display: "swap",
});

// ── Network context ────────────────────────────────────────────────────────────

export const NetworkContext = createContext(null);

export function useNetworkContext() {
  return useContext(NetworkContext);
}

// ── Auth context ───────────────────────────────────────────────────────────────

export const AuthContext = createContext(null);

export function useAuthContext() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// ── App ────────────────────────────────────────────────────────────────────────

function getStoredNetwork() {
  if (typeof window === "undefined") return DEFAULT_NETWORK;
  const stored = localStorage.getItem("fp_network");
  return stored && NETWORKS[stored] ? stored : DEFAULT_NETWORK;
}

export default function App({ Component, pageProps }) {
  const [network] = useState(getStoredNetwork);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingNetwork, setPendingNetwork] = useState(null);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  const networkConfig = NETWORKS[network] || NETWORKS[DEFAULT_NETWORK];

  const setNetwork = useCallback((target) => {
    if (target === network) return;
    if (target === "mainnet") {
      setPendingNetwork(target);
      setShowWarning(true);
    } else {
      if (typeof window !== "undefined") {
        localStorage.setItem("fp_network", target);
        window.location.reload();
      }
    }
  }, [network]);

  const confirmSwitch = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("fp_network", pendingNetwork);
      window.location.reload();
    }
  }, [pendingNetwork]);

  const cancelSwitch = useCallback(() => {
    setShowWarning(false);
    setPendingNetwork(null);
  }, []);

  const networkCtx = useMemo(
    () => ({ network, networkConfig, setNetwork, isMainnet: networkConfig.isMainnet }),
    [network, networkConfig, setNetwork]
  );

  useEffect(() => {
    const cleanup = initTheme();
    return cleanup;
  }, []);

  return (
    <NetworkContext.Provider value={networkCtx}>
      {showWarning && (
        <MainnetWarningModal onConfirm={confirmSwitch} onCancel={cancelSwitch} />
      )}
      <div
        className={`${gaegu.variable} ${nunito.variable} ${inter.variable} ${spaceGrotesk.variable}`}
        style={{ minHeight: "100vh" }}
      >
        {/* key={network} forces ConnectionProvider to remount when network changes */}
        <ConnectionProvider endpoint={networkConfig.rpcUrl} key={network}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <AuthProvider>
                <ErrorBoundary>
                  <Component {...pageProps} />
                </ErrorBoundary>
              </AuthProvider>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </div>
    </NetworkContext.Provider>
  );
}
