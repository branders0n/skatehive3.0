"use client";

import {
  useWriteAuctionCreateBid,
  useWriteAuctionSettleCurrentAndCreateNewAuction,
} from "@/hooks/wagmiGenerated";
import { useCallback, useState } from "react";
import { parseEther, formatEther } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useForm } from "react-hook-form";
import { getConfig } from "@/lib/utils/wagmi";
import { DAO_ADDRESSES } from "@/lib/utils/constants";
import {
  calculateMinBid,
  handleAuctionError,
  validateBid,
} from "@/lib/utils/auction";
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Link,
  Alert,
  AlertIcon,
  AlertDescription,
  HStack,
  Divider,
} from "@chakra-ui/react";
import { base } from "viem/chains";

interface BidProps {
  tokenId: bigint;
  winningBid: bigint;
  isAuctionRunning: boolean;
  reservePrice: string;
  minimumBidIncrement: string;
  onBid?: () => void;
  onSettle?: () => void;
  alignContent?: "left" | "right";
  onBidButtonHover?: (isHovering: boolean) => void;
}

export function AuctionBid({
  tokenId,
  winningBid,
  isAuctionRunning,
  reservePrice,
  minimumBidIncrement,
  onBid,
  onSettle,
  alignContent = "left",
  onBidButtonHover,
}: BidProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const account = useAccount();
  const [hasShownToast, setHasShownToast] = useState(false);
  const toast = require("@chakra-ui/react").useToast();
  const { switchChain } = useSwitchChain()

  // Calculate minimum bid: currentBid + (currentBid * increment%)
  const minBidValue = calculateMinBid(
    winningBid,
    BigInt(reservePrice),
    minimumBidIncrement
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: { bidAmount: formatEther(minBidValue) },
  });

  const { writeContractAsync: writeBid } = useWriteAuctionCreateBid();
  const { writeContractAsync: writeSettle } =
    useWriteAuctionSettleCurrentAndCreateNewAuction();

  const onSubmitBid = useCallback(
    async (data: { bidAmount: string }) => {
      setIsLoading(true);
      setErrorMessage(null);
      setTxHash(null);

      try {
        switchChain({chainId: base.id})

        const txHash = await writeBid({
          address: DAO_ADDRESSES.auction,
          args: [tokenId],
          value: parseEther(data.bidAmount),
        });

        await waitForTransactionReceipt(getConfig(), { hash: txHash });
        setTxHash(txHash);

        // Show toast for successful transaction
        toast({
          title: "Transaction Successful!",
          description: (
            <>
              Your bid was placed successfully.{" "}
              <Link
                href={`https://basescan.org/tx/${txHash}`}
                isExternal
                color="primary"
                textDecoration="underline"
                _hover={{ color: "accent" }}
              >
                View on Basescan
              </Link>
            </>
          ),
          status: "success",
          duration: 9000,
          isClosable: true,
          position: "top",
        });
        setHasShownToast(true);

        // Update for next bid
        const currentBid = parseEther(data.bidAmount);
        const nextMinBid = calculateMinBid(
          currentBid,
          BigInt(reservePrice),
          minimumBidIncrement
        );
        setValue("bidAmount", formatEther(nextMinBid));

        // Wait for subgraph to update
        await new Promise((resolve) => setTimeout(resolve, 5000));
        onBid?.();
      } catch (error: any) {
        console.error("Bid failed:", error);
        setErrorMessage(handleAuctionError(error));
      } finally {
        setIsLoading(false);
      }
    },
    [tokenId, writeBid, onBid, minimumBidIncrement, setValue, reservePrice]
  );

  const handleSettle = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setTxHash(null);

    try {
      const txHash = await writeSettle({
        address: DAO_ADDRESSES.auction,
      });
      await waitForTransactionReceipt(getConfig(), { hash: txHash });
      setTxHash(txHash);

      // Wait for subgraph to update
      await new Promise((resolve) => setTimeout(resolve, 5000));
      onSettle?.();
    } catch (error: any) {
      console.error("Settlement failed:", error);
      setErrorMessage(handleAuctionError(error));
    } finally {
      setIsLoading(false);
    }
  }, [writeSettle, onSettle]);

  return (
    <VStack spacing={4} align="stretch" w="full">
      {/* Error Alert */}
      {errorMessage && (
        <Alert
          status="error"
          bg="error"
          opacity={0.1}
          border="1px solid"
          borderColor="error"
          borderRadius="md"
          py={3}
        >
          <AlertIcon color="error" />
          <AlertDescription color="error" fontSize="sm">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Transaction Hash Toast handled in logic above */}

      {isAuctionRunning ? (
        <Box as="form" onSubmit={handleSubmit(onSubmitBid)} w="full">
          <VStack
            spacing={4}
            align={alignContent === "right" ? "end" : "stretch"}
          >
            <FormControl isInvalid={!!errors.bidAmount}>
              <FormLabel
                color="text"
                fontSize="sm"
                fontWeight="medium"
                mb={2}
                textAlign={alignContent === "right" ? "right" : "left"}
              >
                Your Bid (ETH)
              </FormLabel>
              <Input
                {...register("bidAmount", {
                  required: "Bid amount required",
                  validate: (value) => {
                    const numValue = Number(value);
                    if (isNaN(numValue)) return "Invalid number";
                    if (numValue <= 0) return "Bid must be greater than 0";

                    const minBidEth = parseFloat(formatEther(minBidValue));
                    if (numValue < minBidEth) {
                      return `Minimum bid: ${formatEther(minBidValue)} ETH`;
                    }
                    return true;
                  },
                })}
                type="number"
                step="0.000001"
                min="0.000001"
                placeholder="Enter bid amount"
                bg="muted"
                borderColor="border"
                color="text"
                size="lg"
                _hover={{ borderColor: "primary" }}
                _focus={{ borderColor: "primary", boxShadow: "outline" }}
                isDisabled={!account.isConnected || isLoading}
                textAlign={alignContent === "right" ? "right" : "left"}
              />
              <FormErrorMessage color="error" fontSize="xs">
                {errors.bidAmount?.message}
              </FormErrorMessage>
              <Text
                fontSize="xs"
                color="accent"
                mt={1}
                textAlign={alignContent === "right" ? "right" : "left"}
              >
                Minimum bid: {formatEther(minBidValue)} ETH
              </Text>
            </FormControl>

            <Button
              type="submit"
              variant="solid"
              size="lg"
              width="full"
              bg="primary"
              color="background"
              _hover={{ bg: "accent", color: "background" }}
              _disabled={{ bg: "muted", color: "text", cursor: "not-allowed" }}
              isDisabled={!account.isConnected || isLoading}
              isLoading={isLoading}
              loadingText="Placing Bid..."
              h="48px"
              onMouseEnter={() => onBidButtonHover?.(true)}
              onMouseLeave={() => onBidButtonHover?.(false)}
            >
              {isLoading ? "Placing Bid..." : "Place Bid"}
            </Button>
          </VStack>
        </Box>
      ) : (
        <VStack spacing={4} align="stretch">
          <Button
            onClick={handleSettle}
            variant="solid"
            size="lg"
            width="full"
            bg="success"
            color="background"
            _hover={{ bg: "primary", color: "background" }}
            _disabled={{ bg: "muted", color: "text", cursor: "not-allowed" }}
            isDisabled={!account.isConnected || isLoading}
            isLoading={isLoading}
            loadingText="Settling..."
            h="48px"
          >
            {isLoading ? "Settling..." : "Start Next Auction"}
          </Button>
        </VStack>
      )}

      {/* Wallet Connection Notice */}
      {!account.isConnected && (
        <Box
          bg="muted"
          opacity={0.1}
          border="1px solid"
          borderColor="muted"
          borderRadius="md"
          p={4}
          textAlign="center"
        >
          <Text color="muted" fontSize="sm">
            Connect your wallet to participate in the auction
          </Text>
        </Box>
      )}
    </VStack>
  );
}
