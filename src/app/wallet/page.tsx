import type { Metadata } from "next";
import { PlannedView } from "@/views/PlannedView";

export const metadata: Metadata = { title: "Wallet" };

export default function Page() {
  return (
    <PlannedView
      eyebrow="Wallet"
      title="Wallet connectivity"
      stage="Stage 4"
      summary="Connect a self-custody wallet to view balances and asset-backed tokens. Testnets only during development."
      items={[
        "WalletConnect and injected wallets (MetaMask, Coinbase Wallet, Rabby)",
        "Ethereum, Polygon and Base networks, starting on testnets",
        "Token balances, ownership and on-chain transaction history",
      ]}
    />
  );
}
