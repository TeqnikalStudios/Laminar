import type { Metadata } from "next";
import { PlannedView } from "@/views/PlannedView";

export const metadata: Metadata = { title: "Asset Tokenization" };

export default function Page() {
  return (
    <PlannedView
      eyebrow="Asset Tokenization"
      title="Tokenize a real-world asset"
      stage="Stage 2"
      summary="A guided application for submitting real estate, businesses, commodities, collectibles and IP for tokenization review."
      items={[
        "Account registration and identity verification (KYC provider integration)",
        "Asset category selection and guided description, valuation and ownership forms",
        "Encrypted upload of ownership proof, legal documents and independent appraisals",
        "Proposed token structure and ownership rights",
        "Compliance questionnaires, then submission for administrative review",
        "Optional import of asset metadata from a client's GitHub repository via the LAMINAR GitHub App",
      ]}
    />
  );
}
