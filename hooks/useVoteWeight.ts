"use client";
import { useState, useEffect } from "react";
import { DEFAULT_VOTE_WEIGHT } from "@/lib/utils/constants";
import useHiveAccount from "./useHiveAccount";

export default function useVoteWeight(username: string) {
  const [voteWeight, setVoteWeight] = useState(DEFAULT_VOTE_WEIGHT);
  const { hiveAccount } = useHiveAccount(username);

  useEffect(() => {
    if (hiveAccount?.json_metadata) {
      try {
        const parsedMetadata = JSON.parse(hiveAccount.json_metadata);
        const customVoteWeight = parsedMetadata?.extensions?.vote_weight;
        if (typeof customVoteWeight === 'number' && customVoteWeight >= 0 && customVoteWeight <= 100) {
          setVoteWeight(customVoteWeight);
        }
      } catch (error) {
        console.error("Failed to parse vote weight from metadata:", error);
      }
    }
  }, [hiveAccount]);

  return voteWeight;
} 