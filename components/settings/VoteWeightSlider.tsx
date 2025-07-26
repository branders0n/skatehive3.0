"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  VStack,
  Heading,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Button,
  useToast,
  Flex,
  Image,
} from "@chakra-ui/react";
import { useAioha } from "@aioha/react-ui";
import { KeychainSDK, KeychainKeyTypes } from "keychain-sdk";
import { DEFAULT_VOTE_WEIGHT } from "@/lib/utils/constants";
import { Operation } from "@hiveio/dhive";

interface VoteWeightSliderProps {
  username: string;
  currentVoteWeight?: number;
  onVoteWeightUpdate?: (voteWeight: number) => void;
}

const VoteWeightSlider: React.FC<VoteWeightSliderProps> = ({
  username,
  currentVoteWeight = DEFAULT_VOTE_WEIGHT,
  onVoteWeightUpdate,
}) => {
  const { user } = useAioha();
  const toast = useToast();
  const [sliderValue, setSliderValue] = useState(currentVoteWeight);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update slider value when currentVoteWeight changes
  useEffect(() => {
    setSliderValue(currentVoteWeight);
    setHasChanges(false);
  }, [currentVoteWeight]);

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    setHasChanges(value !== currentVoteWeight);
  };

  const handleSave = async () => {
    if (!user || user !== username) {
      toast({
        title: "Error",
        description: "You can only update your own vote weight",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSaving(true);
    try {
      const keychain = new KeychainSDK(window);

      // Get current profile metadata
      const accounts = await fetch(`https://api.hive.blog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "condenser_api.get_accounts",
          params: [[username]],
          id: 1,
        }),
      }).then((res) => res.json());

      if (!accounts.result || accounts.result.length === 0) {
        throw new Error("Account not found");
      }

      const account = accounts.result[0];
      let currentMetadata: any = {};

      // Parse existing metadata
      try {
        if (account.json_metadata) {
          currentMetadata = JSON.parse(account.json_metadata);
        }
      } catch (error) {
        console.log("No existing metadata or invalid JSON");
      }

      // Ensure extensions object exists
      if (!currentMetadata.extensions) {
        currentMetadata.extensions = {};
      }

      // Update vote weight in extensions
      currentMetadata.extensions.vote_weight = sliderValue;

      // Create the account update operation
      const operation: Operation = [
        "account_update2",
        {
          account: username,
          json_metadata: JSON.stringify(currentMetadata),
          posting_json_metadata: account.posting_json_metadata || "{}",
          extensions: [],
        },
      ];

      const formParamsAsObject = {
        data: {
          username: username,
          operations: [operation],
          method: KeychainKeyTypes.active,
        },
      };

      const result = await keychain.broadcast(formParamsAsObject.data as any);

      if (!result) {
        throw new Error("Failed to update vote weight");
      }

      toast({
        title: "Vote Weight Updated!",
        description: `Default vote weight set to ${sliderValue}%`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setHasChanges(false);
      onVoteWeightUpdate?.(sliderValue);
    } catch (error: any) {
      console.error("Failed to update vote weight:", error);
      
      // Check if it's a user cancellation
      if (error.message?.includes("user_cancel") || 
          error.message?.includes("cancelled") ||
          error.message?.includes("User cancelled") ||
          error.message?.includes("User rejected") ||
          error.message?.includes("User denied")) {
        // Don't show error toast for user cancellation
        console.log("User cancelled vote weight update");
      } else {
        // Show error toast for actual errors
        let errorMessage = "Failed to update vote weight";
        if (error.message?.includes("insufficient")) {
          errorMessage = "Insufficient resource credits to update";
        } else if (error.message?.includes("serialize")) {
          errorMessage = "Transaction serialization failed. Please try again.";
        } else if (error.message?.includes("network") || error.message?.includes("timeout")) {
          errorMessage = "Network error. Please check your connection and try again.";
        }

        toast({
          title: "Error",
          description: errorMessage,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box
      bg="background"
      border="1px solid"
      borderColor="muted"
      p={6}
      shadow="sm"
    >
      <VStack spacing={4} align="stretch">
        <Box>
          <Heading size="md" color="primary" mb={1}>
            🎯 Default Vote Weight
          </Heading>
          <Text color="primary" fontSize="sm">
            Set your default vote weight percentage for posts and snaps
          </Text>
        </Box>

        <Box py={4}>
          <Flex alignItems="center" mb={4}>
            <Box width="100%" mr={4}>
              <Slider
                aria-label="vote-weight-slider"
                min={0}
                max={100}
                value={sliderValue}
                onChange={handleSliderChange}
                step={1}
              >
                <SliderTrack
                  bg="gray.700"
                  height="8px"
                  boxShadow="0 0 10px rgba(255, 255, 0, 0.8)"
                >
                  <SliderFilledTrack bgGradient="linear(to-r, success, warning, error)" />
                </SliderTrack>
                <SliderThumb
                  boxSize="30px"
                  bg="transparent"
                  boxShadow={"none"}
                  _focus={{ boxShadow: "none" }}
                  zIndex={1}
                >
                  <Image
                    src="/images/spitfire.png"
                    alt="thumb"
                    w="100%"
                    h="auto"
                    mr={2}
                    mb={1}
                  />
                </SliderThumb>
              </Slider>
            </Box>
            <Text
              color="primary"
              fontSize="lg"
              fontWeight="bold"
              minW="60px"
              textAlign="center"
            >
              {sliderValue}%
            </Text>
          </Flex>


        </Box>

        <Button
          onClick={handleSave}
          isLoading={isSaving}
          loadingText="Saving..."
          disabled={!hasChanges}
          bgGradient="linear(to-r, primary, accent)"
          color="background"
          _hover={{ bg: "accent" }}
          fontWeight="bold"
          size="lg"
        >
          Save Vote Weight
        </Button>

        {hasChanges && (
          <Text color="accent" fontSize="sm" textAlign="center">
            Changes detected - click save to update your default vote weight
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default VoteWeightSlider; 