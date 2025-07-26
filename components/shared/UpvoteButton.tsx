"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Tooltip,
  useToast,
  HStack,
  Flex,
  Image,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from "@chakra-ui/react";
import { LuArrowUpRight } from "react-icons/lu";
import { useAioha } from "@aioha/react-ui";
import { Discussion } from "@hiveio/dhive";
import VoteListPopover from "@/components/blog/VoteListModal";
import { DEFAULT_VOTE_WEIGHT } from "@/lib/utils/constants";

interface UpvoteButtonProps {
  discussion: Discussion;
  voted: boolean;
  setVoted: (voted: boolean) => void;
  activeVotes: any[];
  setActiveVotes: (votes: any[]) => void;
  onVoteSuccess?: (estimatedValue?: number) => void;
  estimateVoteValue?: (percentage: number) => Promise<number>;
  size?: "sm" | "md" | "lg";
  variant?: "simple" | "withSlider" | "withVoteCount";
  showSlider?: boolean;
  setShowSlider?: (show: boolean) => void;
  className?: string;
}

const UpvoteButton = ({
  discussion,
  voted,
  setVoted,
  activeVotes,
  setActiveVotes,
  onVoteSuccess,
  estimateVoteValue,
  size = "sm",
  variant = "simple",
  showSlider = false,
  setShowSlider,
  className,
}: UpvoteButtonProps) => {
  const { aioha, user } = useAioha();
  const toast = useToast();
  const [sliderValue, setSliderValue] = useState(DEFAULT_VOTE_WEIGHT);
  const [isVoting, setIsVoting] = useState(false);

  // Deduplicate votes by voter (keep the last occurrence)
  const uniqueVotesMap = new Map();
  activeVotes.forEach((vote) => {
    uniqueVotesMap.set(vote.voter, vote);
  });
  const uniqueVotes = Array.from(uniqueVotesMap.values());

  const handleHeartClick = () => {
    if (variant === "withSlider" && setShowSlider) {
      setShowSlider(!showSlider);
    } else if (variant === "simple" || variant === "withVoteCount") {
      handleVote(DEFAULT_VOTE_WEIGHT); // Use constant for default vote percentage
    }
  };

  const handleVote = async (votePercentage: number = sliderValue) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to vote.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsVoting(true);
    try {
      const vote = await aioha.vote(
        discussion.author,
        discussion.permlink,
        votePercentage * 100
      );

      if (vote.success) {
        setVoted(true);
        setActiveVotes([...activeVotes, { voter: user }]);

        // Estimate the value and call onVoteSuccess if provided
        if (estimateVoteValue && onVoteSuccess) {
          try {
            const estimatedValue = await estimateVoteValue(votePercentage);
            onVoteSuccess(estimatedValue);
          } catch (e) {
            onVoteSuccess();
          }
        } else if (onVoteSuccess) {
          onVoteSuccess();
        }

        toast({
          title: "Vote submitted!",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to vote",
        description: error.message || "Please try again",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsVoting(false);
      if (variant === "withSlider" && setShowSlider) {
        setShowSlider(false);
      }
    }
  };

  // Simple variant - just the upvote button (matches Snap styling)
  if (variant === "simple") {
    return (
      <HStack>
        <Tooltip label="upvote" hasArrow openDelay={1000}>
          <Box
            as="span"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            onClick={handleHeartClick}
            p={1}
            borderRadius="full"
            bg={!voted ? "muted" : undefined}
            _hover={!voted ? { bg: "primary" } : undefined}
            transition="background 0.2s, border-radius 0.2s"
            className={`${className} ${!voted ? "arrow-bg-fade" : ""}`}
          >
            <LuArrowUpRight
              size={24}
              color={voted ? "var(--chakra-colors-success)" : "var(--chakra-colors-accent)"}
              style={{ opacity: 1 }}
              className={!voted ? "arrow-pulse" : ""}
            />
          </Box>
        </Tooltip>
      </HStack>
    );
  }

  // With vote count variant (matches Snap styling exactly)
  if (variant === "withVoteCount") {
    return (
      <HStack>
        <Tooltip label="upvote" hasArrow openDelay={1000}>
          <Box
            as="span"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            onClick={handleHeartClick}
            p={1}
            borderRadius="full"
            bg={!voted ? "muted" : undefined}
            _hover={!voted ? { bg: "primary" } : undefined}
            transition="background 0.2s, border-radius 0.2s"
            className={`${className} ${!voted ? "arrow-bg-fade" : ""}`}
          >
            <LuArrowUpRight
              size={24}
              color={voted ? "var(--chakra-colors-success)" : "var(--chakra-colors-accent)"}
              style={{ opacity: 1 }}
              className={!voted ? "arrow-pulse" : ""}
            />
          </Box>
        </Tooltip>
        <VoteListPopover
          trigger={
            <Button
              variant="ghost"
              size={size}
              ml={1}
              p={1}
              _hover={{ textDecoration: "underline" }}
              onClick={(e) => e.stopPropagation()}
            >
              {uniqueVotes.length}
            </Button>
          }
          votes={activeVotes}
          post={discussion}
        />
      </HStack>
    );
  }

  // With slider variant (matches Snap styling exactly)
  if (variant === "withSlider") {
    if (showSlider) {
      return (
        <Flex mt={4} alignItems="center">
          <Box width="100%" mr={2}>
            <Slider
              aria-label="vote-slider"
              min={0}
              max={100}
              value={sliderValue}
              onChange={(val) => setSliderValue(val)}
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
          <Button
            size={size}
            onClick={() => handleVote()}
            ml={2}
            bgGradient="linear(to-r, primary, accent)"
            color="background"
            _hover={{ bg: "accent" }}
            fontWeight="bold"
            className="subtle-pulse"
            isDisabled={isVoting}
            isLoading={isVoting}
          >
            {isVoting ? "Voting..." : `Vote ${sliderValue}%`}
          </Button>
          <Button
            size={size}
            onClick={handleHeartClick}
            ml={2}
            bg="muted"
            color="primary"
            _hover={{ bg: "muted", opacity: 0.8 }}
          >
            X
          </Button>
        </Flex>
      );
    }

    return (
      <HStack>
        <Tooltip label="upvote" hasArrow openDelay={1000}>
          <Box
            as="span"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            onClick={handleHeartClick}
            p={1}
            borderRadius="full"
            bg={!voted ? "muted" : undefined}
            _hover={!voted ? { bg: "primary" } : undefined}
            transition="background 0.2s, border-radius 0.2s"
            className={`${className} ${!voted ? "arrow-bg-fade" : ""}`}
          >
            <LuArrowUpRight
              size={24}
              color={voted ? "var(--chakra-colors-success)" : "var(--chakra-colors-accent)"}
              style={{ opacity: 1 }}
              className={!voted ? "arrow-pulse" : ""}
            />
          </Box>
        </Tooltip>
        <VoteListPopover
          trigger={
            <Button
              variant="ghost"
              size={size}
              ml={1}
              p={1}
              _hover={{ textDecoration: "underline" }}
              onClick={(e) => e.stopPropagation()}
            >
              {uniqueVotes.length}
            </Button>
          }
          votes={activeVotes}
          post={discussion}
        />
      </HStack>
    );
  }

  return null;
};

const UpvoteButtonWithPulse = (props: UpvoteButtonProps) => {
  return (
    <>
      <style jsx global>{`
        .subtle-pulse {
          animation: subtle-pulse 2s infinite;
        }
        @keyframes subtle-pulse {
          0% {
            box-shadow: 0 0 0 0 var(--chakra-colors-accent);
          }
          70% {
            box-shadow: 0 0 0 4px rgba(72, 255, 128, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(72, 255, 128, 0);
          }
        }
        
        .arrow-pulse {
          animation: arrow-pulse 3s ease-in-out infinite;
        }
        .arrow-bg-fade {
          animation: arrow-bg-fade 3s ease-in-out infinite;
        }
        .arrow-bg-fade:hover {
          animation: arrow-bg-fade-hover 3s ease-in-out infinite;
        }
        @keyframes arrow-pulse {
          0% {
            transform: scale(1) translate(0, 0);
          }
          50% {
            transform: scale(1.1) translate(2px, -2px);
          }
          100% {
            transform: scale(1) translate(0, 0);
          }
        }
        @keyframes arrow-bg-fade {
          0% {
            background-color: var(--chakra-colors-muted);
          }
          50% {
            background-color: transparent;
          }
          100% {
            background-color: var(--chakra-colors-muted);
          }
        }
        @keyframes arrow-bg-fade-hover {
          0% {
            background-color: var(--chakra-colors-primary);
          }
          50% {
            background-color: transparent;
          }
          100% {
            background-color: var(--chakra-colors-primary);
          }
        }
      `}</style>
      <UpvoteButton {...props} />
    </>
  );
};

export default UpvoteButtonWithPulse; 