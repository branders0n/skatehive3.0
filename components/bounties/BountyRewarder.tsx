import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Checkbox,
  CheckboxGroup,
  VStack,
  Text,
  Button,
  Divider,
  useTheme,
  Box,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { Discussion } from "@hiveio/dhive";
import { transferWithKeychain } from "@/lib/hive/client-functions";
import { KeychainSDK } from "keychain-sdk";

interface BountyRewarderProps {
  isOpen: boolean;
  onClose: () => void;
  post: Discussion;
  user: string | null;
  uniqueCommenters: string[];
  challengeName: string;
  rewardInfo: {
    amount: number;
    currency: string;
  };
  onRewardSuccess: () => void;
  addComment: (newComment: Discussion) => void;
}

const BountyRewarder: React.FC<BountyRewarderProps> = ({
  isOpen,
  onClose,
  post,
  user,
  uniqueCommenters,
  challengeName,
  rewardInfo,
  onRewardSuccess,
  addComment,
}) => {
  const theme = useTheme();
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [isRewarding, setIsRewarding] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [rewardSuccess, setRewardSuccess] = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");

  const rewardPerWinner =
    selectedWinners.length > 0
      ? (rewardInfo.amount / selectedWinners.length).toFixed(3)
      : "0";

  const handleRewardBountyHunters = async () => {
    if (!user) {
      setRewardError("You must be logged in to reward bounty hunters.");
      return;
    }

    setIsRewarding(true);
    setRewardError(null);
    setRewardSuccess(false);
    
    try {
      // Step 1: Send tip to each winner sequentially
      console.log("Starting tip transfers...");
      setCurrentStep("Sending rewards...");
      
      for (let i = 0; i < selectedWinners.length; i++) {
        const winner = selectedWinners[i];
        try {
          console.log(`Sending tip to ${winner}... (${i + 1}/${selectedWinners.length})`);
          setCurrentStep(`Sending reward to @${winner}... (${i + 1}/${selectedWinners.length})`);
          
          const transferResult = await transferWithKeychain(
            String(user),
            winner,
            rewardPerWinner,
            `Congrats @${winner}! You won ${rewardPerWinner} ${rewardInfo.currency} in the bounty: ${challengeName}`,
            rewardInfo.currency
          );
          console.log(`Transfer to ${winner} successful:`, transferResult);
        } catch (err) {
          console.error(`Transfer error for ${winner}:`, err);
          setRewardError(`Failed to send reward to @${winner}. Please try again.`);
          setCurrentStep("");
          setIsRewarding(false);
          return; // Exit early if any transfer fails
        }
      }
      
      // Step 2: Only if ALL transfers were successful, proceed with posting the comment
      console.log("All transfers successful, proceeding with comment...");
      setCurrentStep("Announcing Winners... Confirm the keychain transaction to make a post in this bounty tagging the winners");
      
      const winnersList = selectedWinners.map((w) => `@${w}`).join(", ");
      const commentBody = `🏆 Bounty Winners! 🏆\n\nCongratulations to: ${winnersList}\n\nReward: ${rewardPerWinner} ${rewardInfo.currency}\n\nThank you for participating!`;
      const permlink = `bounty-winners-${Date.now()}`;
      
      // Validation: ensure all required fields are present
      const missingFields = [];
      if (!user || user === "undefined") missingFields.push("user");
      if (!post.author || post.author === "undefined")
        missingFields.push("post.author");
      if (!post.permlink || post.permlink === "undefined")
        missingFields.push("post.permlink");
      if (!permlink || permlink === "undefined") missingFields.push("permlink");
      if (!commentBody || commentBody === "undefined")
        missingFields.push("commentBody");

      if (missingFields.length > 0) {
        setRewardError("Missing required data: " + missingFields.join(", "));
        setIsRewarding(false);
        return;
      }
      
      const postObj = {
        username: String(user),
        body: commentBody,
        parent_username: post.author,
        parent_perm: post.permlink,
        permlink,
        json_metadata: JSON.stringify({}),
        comment_options: "",
      };
      
      console.log("Prepared minimal comment postObj:", postObj);
      
      // Validate all fields are present and not undefined
      for (const [key, value] of Object.entries(postObj)) {
        if (value === undefined || value === null || value === "undefined") {
          setRewardError(`Field ${key} is missing or undefined.`);
          setIsRewarding(false);
          return;
        }
      }
      
      try {
        const keychain = new KeychainSDK(window);
        const commentResult = await keychain.post(postObj);
        console.log("Keychain result:", commentResult);
        if (!commentResult || commentResult.success === false) {
          throw new Error("Failed to post bounty winner comment.");
        }
        
        // Add the new comment to the comments list immediately
        const newComment = {
          author: String(user),
          permlink,
          body: commentBody,
          parent_author: post.author,
          parent_permlink: post.permlink,
          created: new Date().toISOString(),
          children: 0,
          active_votes: [],
          replies: [],
          // Add required Discussion properties with minimal values
          id: 0,
          active: new Date().toISOString(),
          total_vote_weight: 0,
          url: `/${post.author}/${post.permlink}#@${user}/${permlink}`,
          root_title: post.parent_permlink ? post.root_title || "" : post.title || "",
          pending_payout_value: "0.000 HBD",
          total_pending_payout_value: "0.000 HBD",
          cashout_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          max_cashout_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          total_payout_value: "0.000 HBD",
          curator_payout_value: "0.000 HBD",
          author_rewards: "0",
          net_rshares: "0",
          abs_rshares: "0",
          vote_rshares: "0",
          children_abs_rshares: "0",
          max_accepted_payout: "1000000.000 HBD",
          percent_hbd: 10000,
          allow_replies: true,
          allow_votes: true,
          allow_curation_rewards: true,
          beneficiaries: [],
          last_update: new Date().toISOString(),
          last_payout: "1970-01-01T00:00:00",
          depth: 1,
          category: post.category || "general",
          title: "",
          json_metadata: "{}",
          author_reputation: 0,
          promoted: "0.000 HBD",
          body_length: commentBody.length.toString(),
          reblogged_by: [],
          net_votes: 0,
          root_comment: 0,
          reward_weight: 0,
        } as Discussion;
        
        addComment(newComment);
      } catch (err) {
        console.error("Keychain post error:", err);
        setRewardError(
          "Failed to post bounty winner comment. " +
            ((err as any)?.message || String(err))
        );
        setIsRewarding(false);
        return;
      }
      
      setRewardSuccess(true);
      onRewardSuccess();
      setCurrentStep("");
      
      // Only close the modal after success
      setTimeout(() => {
        onClose();
        // Show completion overlay
        setShowCompletionOverlay(true);
        // Hide overlay after 3 seconds
        setTimeout(() => {
          setShowCompletionOverlay(false);
        }, 3000);
        // Reset state for next use
        setSelectedWinners([]);
        setRewardError(null);
        setRewardSuccess(false);
      }, 2000);
    } catch (err: any) {
      setRewardError(err.message || "Failed to reward bounty hunters.");
    } finally {
      setIsRewarding(false);
    }
  };

  const handleClose = () => {
    if (!isRewarding) {
      onClose();
      // Reset state
      setSelectedWinners([]);
      setRewardError(null);
      setRewardSuccess(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
        <ModalContent
          bg="muted"
          border="1px solid"
          borderColor="border"
          color="text"
        >
        <ModalHeader color="primary" fontWeight="bold">
          Select Bounty Winners
        </ModalHeader>
        <ModalCloseButton color="text" />
        <ModalBody>
          <Text mb={2} color="text">
            Select the users who won this bounty:
          </Text>
          <CheckboxGroup
            value={selectedWinners}
            onChange={(val) => setSelectedWinners(val as string[])}
          >
            <VStack align="start">
              {uniqueCommenters.map((username: string) => (
                <Checkbox 
                  key={username} 
                  value={username}
                  colorScheme="primary"
                  sx={{
                    '& .chakra-checkbox__control': {
                      borderColor: 'primary',
                      _checked: {
                        bg: 'primary',
                        borderColor: 'primary',
                        '& .chakra-checkbox__icon': {
                          color: 'background',
                        },
                      },
                    },
                    '& .chakra-checkbox__label': {
                      color: 'text',
                    },
                  }}
                >
                  @{username}
                </Checkbox>
              ))}
            </VStack>
          </CheckboxGroup>
          <Divider my={3} borderColor="border" />
          <Text color="text">
            Total Reward:{" "}
            <b style={{ color: theme.colors.primary }}>
              {rewardInfo.amount} {rewardInfo.currency}
            </b>
          </Text>
          <Text color="text">
            Each winner receives:{" "}
            <b style={{ color: theme.colors.accent }}>
              {rewardPerWinner} {rewardInfo.currency}
            </b>
          </Text>
          {rewardError && (
            <Text color="error" mt={2}>
              {rewardError}
            </Text>
          )}
          {currentStep && (
            <Text color="primary" mt={2} fontWeight="bold">
              {currentStep}
            </Text>
          )}
          {rewardSuccess && (
            <Text color="success" mt={2}>
              Bounty rewards sent and winners announced!
            </Text>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            bg="primary"
            color="background"
            _hover={{ bg: "accent" }}
            mr={3}
            isDisabled={selectedWinners.length === 0 || isRewarding}
            onClick={handleRewardBountyHunters}
            isLoading={isRewarding}
            fontWeight="bold"
          >
            Send Reward
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleClose} 
            isDisabled={isRewarding}
            color="text"
            _hover={{ bg: "muted" }}
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    
    {/* Completion Overlay */}
    {showCompletionOverlay && (
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="rgba(0, 0, 0, 0.8)"
        zIndex={9999}
        display="flex"
        alignItems="center"
        justifyContent="center"
        animation="fadeInOut 3s ease-in-out"
        sx={{
          "@keyframes fadeInOut": {
            "0%": { opacity: 0 },
            "20%": { opacity: 1 },
            "80%": { opacity: 1 },
            "100%": { opacity: 0 },
          },
        }}
      >
        <Text
          fontSize="8xl"
          fontWeight="bold"
          color="success"
          textAlign="center"
          textShadow="0 2px 8px rgba(0,0,0,0.5)"
        >
          BOUNTY COMPLETE
        </Text>
      </Box>
    )}
    </>
  );
};

export default BountyRewarder; 