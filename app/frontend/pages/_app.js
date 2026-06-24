import "@/styles/globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { createContext, useContext, useMemo, useEffect } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { Buffer } from "buffer";
import { Gaegu, Nunito } from "next/font/google";
import { initTheme } from "@/utils/theme";
import useAuth from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";

// Make Buffer available globally in the browser for @solana/web3.js
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

const DEVNET_RPC = "https://api.devnet.solana.com";

export const AuthContext = createContext(null);

export function useAuthContext() {
  return useContext(AuthContext);
}

// AuthProvider must live inside WalletProvider so useAuth can call useWallet()
function AuthProvider({ children }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export default function App({ Component, pageProps }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  useEffect(() => {
    const cleanup = initTheme();
    return cleanup;
  }, []);

  return (
    <div className={`${gaegu.variable} ${nunito.variable}`} style={{ minHeight: "100vh" }}>
      <ConnectionProvider endpoint={DEVNET_RPC}>
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
  );
}
