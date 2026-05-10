import "@/styles/globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { Buffer } from "buffer";

// Make Buffer available globally in the browser for @solana/web3.js
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}

const DEVNET_RPC = "https://api.devnet.solana.com";

export default function App({ Component, pageProps }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={DEVNET_RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
