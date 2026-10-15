import type { Metadata } from "next";
import { PlannedView } from "@/views/PlannedView";

export const metadata: Metadata = { title: "My Tokenized Assets" };

export default function Page() {
  return (
    <PlannedView
      eyebrow="My Tokenized Assets"
      title="Applications & tokenized assets"
      stage="Stage 2"
      summary="Track every application through review, and view assets once tokens are issued."
      items={[
        "Status timeline: Draft, Submitted, Identity Verification, Ownership Review, Legal/Compliance Review, Approved for Issuance, Token Deployment, Active",
        "Requests for more information from reviewers, with secure document re-upload",
        "Token details for issued assets: network, contract, supply and holders (Stage 4, testnet first)",
      ]}
    />
  );
}
