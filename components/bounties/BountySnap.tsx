import {
  Box,
  Text,
  HStack,
  Button,
  Avatar,
  Link,
  Flex,
  Tooltip,
  useToast,
  Image,
  useDisclosure,
  Tag,
  AvatarGroup,
} from "@chakra-ui/react";
import { Discussion } from "@hiveio/dhive";
import { LuArrowUpRight } from "react-icons/lu";
import { useAioha } from "@aioha/react-ui";
import { useState, useMemo } from "react";
import { getPayoutValue } from "@/lib/hive/client-functions";
import { EnhancedMarkdownRenderer } from "@/components/markdown/EnhancedMarkdownRenderer";
import { getPostDate } from "@/lib/utils/GetPostDate";
import useHiveAccount from "@/hooks/useHiveAccount";
import VideoRenderer from "@/components/layout/VideoRenderer";
import { FaLink } from "react-icons/fa6";
import useHivePower from "@/hooks/useHivePower";
import VoteListPopover from "@/components/blog/VoteListModal";
import { parse, isAfter } from "date-fns";
import { useTheme } from "@/app/themeProvider";
import PaperOutline from "@/components/graphics/PaperOutline";
import { UpvoteButton } from "@/components/shared";

const separateContent = (body: string) => {
  const textParts: string[] = [];
  const mediaParts: string[] = [];
  const lines = body.split("\n");
  lines.forEach((line: string) => {
    if (line.match(/!\[.*?\]\(.*\)/) || line.match(/<iframe.*<\/iframe>/)) {
      mediaParts.push(line);
    } else {
      textParts.push(line);
    }
  });
  return { text: textParts.join("\n"), media: mediaParts.join("\n") };
};

const renderMedia = (mediaContent: string) => {
  return mediaContent.split("\n").map((item: string, index: number) => {
    if (!item.trim()) return null;
    if (item.includes("![") && item.includes("ipfs.skatehive.app/ipfs/")) {
      return (
        <Box
          key={index}
          sx={{
            img: {
              width: "100%",
              height: "auto",
              objectFit: "contain",
              marginTop: "0.5rem",
              marginBottom: "0.5rem",
            },
          }}
        >
          <EnhancedMarkdownRenderer content={item} />
        </Box>
      );
    }
    if (item.includes("<iframe") && item.includes("</iframe>")) {
      const srcMatch = item.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        const url = srcMatch[1];
        if (url.includes("gateway.pinata.cloud/ipfs/")) {
          const ipfsHash = url.match(/\/ipfs\/([\w-]+)/)?.[1];
          if (ipfsHash) {
            const skatehiveUrl = `https://ipfs.skatehive.app/ipfs/${ipfsHash}`;
            return <VideoRenderer key={index} src={skatehiveUrl} />;
          }
        } else if (url.includes("ipfs.skatehive.app/ipfs/")) {
          return <VideoRenderer key={index} src={url} />;
        }
      }
      return (
        <Box
          key={index}
          dangerouslySetInnerHTML={{ __html: item }}
          suppressHydrationWarning
          sx={{
            iframe: {
              width: "100%",
              height: "auto",
              minHeight: "300px",
            },
          }}
        />
      );
    }
    return (
      <Box
        key={index}
        sx={{
          img: {
            width: "100%",
            height: "auto",
            objectFit: "contain",
            marginTop: "0.5rem",
            marginBottom: "0.5rem",
          },
        }}
      >
        <EnhancedMarkdownRenderer content={item} />
      </Box>
    );
  });
};

interface BountySnapProps {
  discussion: Discussion;
  onOpen: () => void;
  setReply: (Discussion: Discussion) => void;
  setConversation?: (conversation: Discussion) => void;
  hideSubmitButton?: boolean;
  showMedia?: boolean;
  showTitle?: boolean;
  showAuthor?: boolean;
  showPosterBackground?: boolean;
  disableCardClick?: boolean;
  disableFooter?: boolean;
}

const BountySnap = ({
  discussion,
  onOpen,
  setReply,
  setConversation,
  hideSubmitButton,
  showMedia,
  showTitle,
  showAuthor = true,
  showPosterBackground = true,
  disableCardClick = false,
  disableFooter = false,
}: BountySnapProps) => {
  const { aioha, user } = useAioha();
  const { hiveAccount } = useHiveAccount(user || "");
  const theme = useTheme();
  const {
    hivePower,
    isLoading: isHivePowerLoading,
    error: hivePowerError,
    estimateVoteValue,
  } = useHivePower(user);
  const toast = useToast();
  const commentDate = getPostDate(discussion.created);

  const [showSlider, setShowSlider] = useState(false);
  const [activeVotes, setActiveVotes] = useState(discussion.active_votes || []);
  const [rewardAmount, setRewardAmount] = useState(
    parseFloat(getPayoutValue(discussion))
  );
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [inlineReplies, setInlineReplies] = useState<Discussion[]>([]);
  const [inlineComposerStates, setInlineComposerStates] = useState<
    Record<string, boolean>
  >({});
  const [isHovered, setIsHovered] = useState(false);

  const effectiveDepth = discussion.depth || 0;

  const { text, media } = useMemo(() => {
    // Replace labels for display
    let displayBody = discussion.body
      .replace(/Trick\/Challenge:/g, "<b>Challenge:</b>")
      .replace(/Bounty Rules:/g, "<b>Rules:</b>")
      .replace(/Reward:/g, "<b>Reward:</b>")
      .replace(/Deadline:/g, "<b>Deadline:</b>");
    // Remove the Deadline line from the display
    displayBody = displayBody.replace(/^.*<b>Deadline:<\/b>.*$/m, "");
    return separateContent(displayBody);
  }, [discussion.body]);
  const renderedMedia = useMemo(() => renderMedia(media), [media]);

  const [voted, setVoted] = useState(
    discussion.active_votes?.some(
      (item: { voter: string }) => item.voter === user
    ) || false
  );

  function handleConversation() {
    if (setConversation) {
      setConversation(discussion);
    }
  }

  const handleSharePost = async () => {
    // Validate permlink to prevent [object Object] URLs
    if (typeof discussion.permlink !== "string") {
      console.error(
        "🚨 BountySnap: Invalid permlink type:",
        typeof discussion.permlink
      );
      return;
    }

    const postLink = `${window.location.origin}/post/${discussion.author}/${discussion.permlink}`;
    await navigator.clipboard.writeText(postLink);
    toast({
      title: "Post link copied to clipboard.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  function handleInlineNewReply(newComment: Partial<Discussion>) {
    const newReply = newComment as Discussion;
    setInlineReplies((prev: Discussion[]) => [...prev, newReply]);
  }

  function handleReplyButtonClick(permlink: string) {
    setInlineComposerStates((prev: Record<string, boolean>) => ({
      ...prev,
      [permlink]: !prev[permlink],
    }));
  }

  const replies = discussion.replies || [];

  // Deduplicate votes by voter (keep the last occurrence)
  const uniqueVotesMap = new Map();
  activeVotes.forEach((vote) => {
    uniqueVotesMap.set(vote.voter, vote);
  });
  const uniqueVotes = Array.from(uniqueVotesMap.values());

  // Helper to convert Asset or string to string
  function assetToString(val: string | { toString: () => string }): string {
    return typeof val === "string" ? val : val.toString();
  }
  // Helper to parse payout strings like "1.234 HBD"
  function parsePayout(
    val: string | { toString: () => string } | undefined
  ): number {
    if (!val) return 0;
    const str = assetToString(val);
    return parseFloat(str.replace(" HBD", "").replace(",", ""));
  }
  const authorPayout = parsePayout(discussion.total_payout_value);
  const curatorPayout = parsePayout(discussion.curator_payout_value);
  // Calculate days remaining for pending payout
  const createdDate = new Date(discussion.created);
  const now = new Date();
  const timeDifferenceInMs = now.getTime() - createdDate.getTime();
  const timeDifferenceInDays = timeDifferenceInMs / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.max(0, 7 - Math.floor(timeDifferenceInDays));
  const isPending = timeDifferenceInDays < 7;
  const {
    isOpen: isPayoutOpen,
    onOpen: openPayout,
    onClose: closePayout,
  } = useDisclosure();

  // Extract Trick/Challenge as title
  let title = "";
  const trickMatch = discussion.body.match(/Trick\/Challenge:\s*(.*)/);
  if (trickMatch && trickMatch[1]) {
    title = trickMatch[1].trim();
  }

  // Extract Deadline from body (format: MM-DD-YYYY)
  let deadline = null;
  const deadlineMatch = discussion.body.match(
    /Deadline:\s*(\d{2}-\d{2}-\d{4})/
  );
  if (deadlineMatch && deadlineMatch[1]) {
    deadline = parse(deadlineMatch[1], "MM-dd-yyyy", new Date());
  }
  // Calculate static countdown string
  let deadlineCountdown = null;
  if (deadline) {
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs > 0) {
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      let parts = [];
      if (diffDays > 0) parts.push(`${diffDays}d`);
      if (diffHours > 0) parts.push(`${diffHours}h`);
      if (diffMinutes > 0) parts.push(`${diffMinutes}m`);
      deadlineCountdown =
        parts.length > 0 ? (
          <span>
            {parts.join(" ")}{" "}
            <Image
              src="/images/clock.gif"
              alt="clock"
              style={{
                display: "inline",
                width: "18px",
                height: "18px",
                verticalAlign: "middle",
                marginLeft: "2px",
              }}
            />
          </span>
        ) : (
          "Expired"
        );
    } else {
      deadlineCountdown = "Expired";
    }
  }
  const nowDate = new Date();
  let statusNote = null;
  if (deadline) {
    if (isAfter(deadline, nowDate)) {
      statusNote = (
        <Tag bg="success" color="background" size="md" mb={1}>
          Active
        </Tag>
      );
    } else {
      statusNote = (
        <Tag bg="error" color="background" size="md" mb={1}>
          Complete
        </Tag>
      );
    }
  }

  return (
    <Box
      as="div"
      role={disableCardClick ? undefined : "button"}
      onClick={disableCardClick ? undefined : onOpen}
      tabIndex={disableCardClick ? undefined : 0}
      aria-label={disableCardClick ? undefined : "Open bounty submission"}
      pl={effectiveDepth > 1 ? 1 : 0}
      ml={effectiveDepth > 1 ? 2 : 0}
      p={0}
      pt={4}
      position="relative"
      display="flex"
      flexDirection="column"
      minHeight="370px"
      maxHeight="370px"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        ...(showPosterBackground
          ? {
              // Responsive background for desktop/mobile
              "@media (max-width: 767px)": {
                backgroundImage: "none",
                backgroundColor: theme.theme.colors.muted,
                border: "1px solid",
                borderColor: theme.theme.colors.border,
                boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                borderRadius: "16px",
                overflow: "hidden",
                transition:
                  "box-shadow 0.2s, background 0.2s, background-image 0.2s",
                cursor: disableCardClick ? "default" : "pointer",
              },
              "@media (min-width: 768px)": {
                backgroundImage: "url(/images/paper.svg)",
                backgroundRepeat: "no-repeat",
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
                borderRadius: "16px",
                overflow: "hidden",
                transition:
                  "box-shadow 0.2s, background 0.2s, background-image 0.2s",
                cursor: disableCardClick ? "default" : "pointer",
              },
            }
          : {
              borderRadius: "16px",
              overflow: "hidden",
              transition:
                "box-shadow 0.2s, background 0.2s, background-image 0.2s",
              cursor: disableCardClick ? "default" : "pointer",
              ...(disableCardClick
                ? {}
                : {
                    ":hover": {
                      boxShadow:
                        "0 0 0 3px #ff9800, 0 2px 16px rgba(0,0,0,0.18)",
                    },
                  }),
            }),
      }}
    >
      {/* Overlay for readability (restored) */}
      {showPosterBackground && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="background"
          opacity={0.85}
          zIndex={0}
          borderRadius="16px"
        />
      )}
      {/* PaperOutline SVG on hover (desktop only) */}
      {showPosterBackground && (
        <Box
          display={{ base: "none", md: "block" }}
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={1}
          pointerEvents="none"
          opacity={isHovered ? 1 : 0}
          transition="opacity 0.2s"
        >
          <PaperOutline
            stroke={
              theme.theme.colors.border || theme.theme.colors.accent || "#000"
            }
            width="105%"
            height="100%"
            style={{
              display: "block",
              width: "105%",
              height: "100%",
              position: "absolute",
              left: "-2.5%",
              top: 0,
            }}
          />
        </Box>
      )}
      {/* Title at the very top */}
      <Box px={4} pt={3} zIndex={1}>
        <Box
          mb={1}
          minHeight="2.5em"
          maxHeight="2.5em"
          display="flex"
          alignItems="center"
          lineHeight="1.1em"
          wordBreak="break-word"
        >
          <Text
            fontWeight="bold"
            fontSize="xl"
            lineHeight="1.1"
            display="block"
          >
            {title || "Untitled Bounty"}
          </Text>
        </Box>
        {/* Author, status, time row */}
        <Flex align="center" justify="space-between" width="100%" mb={1}>
          {showAuthor && (
            <Box display="flex" alignItems="center">
              <Text mr={1} fontWeight="normal" fontSize="md" color="gray.400">
                by
              </Text>
              <Link
                href={`/user/${discussion.author}`}
                _hover={{ textDecoration: "none" }}
                display="flex"
                alignItems="center"
                role="group"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar
                  size="xs"
                  name={discussion.author}
                  src={`https://images.hive.blog/u/${discussion.author}/avatar/sm`}
                  ml={0}
                />
                <Text
                  fontWeight="medium"
                  fontSize="sm"
                  ml={1}
                  whiteSpace="nowrap"
                  _groupHover={{ textDecoration: "underline" }}
                  textShadow="0 2px 8px rgba(0,0,0,0.25)"
                >
                  {discussion.author}
                </Text>
              </Link>
            </Box>
          )}
          <Text
            fontWeight="medium"
            fontSize="sm"
            color="gray"
            textShadow="0 2px 8px rgba(0,0,0,0.18)"
          >
            {commentDate}
          </Text>
        </Flex>
        {/* Centered status row */}
        <Flex align="center" justify="center" width="100%" mb={2}>
          <Box>{statusNote}</Box>
        </Flex>
        {/* Reward bar (now below header, above description, no background) */}
        <Box mb={2}>
          <Text
            fontWeight="bold"
            fontSize="md"
            color="warning"
            letterSpacing="wider"
          >
            Reward:{" "}
            {(() => {
              const match = discussion.body.match(/Reward:\s*([^\n]*)/);
              return match && match[1] ? match[1].trim() : "N/A";
            })()}
          </Text>
        </Box>
      </Box>

      {/* Main scrollable content area (description + avatars + media) */}
      <Box
        position="relative"
        flex="1 1 auto"
        overflowY="auto"
        px={4}
        pt="0px"
        pb={0}
        zIndex={1}
        minHeight={0}
        sx={{
          "::-webkit-scrollbar": { display: "none" }, // Hide scrollbar for Chrome, Safari
          scrollbarWidth: "none", // Hide scrollbar for Firefox
        }}
      >
        {/* Rules (5 lines, clamp) */}
        {text && (
          <Box mb={2} lineHeight="1.1em" wordBreak="break-word">
            <Text fontSize="md" lineHeight="1.1" display="block">
              {/* Only show rules part of text */}
              {(() => {
                const rulesMatch = discussion.body.match(
                  /Bounty Rules:\s*([\s\S]*?)(?:\n|$)/
                );
                return rulesMatch && rulesMatch[1] ? rulesMatch[1].trim() : "";
              })()}
            </Text>
          </Box>
        )}
        {/* Claimants Avatars */}
        {uniqueVotes && uniqueVotes.length > 0 && (
          <Flex justify="center" mt={4} mb={2}>
            {uniqueVotes.map((vote) => (
              <Tooltip label={vote.voter} key={vote.voter} hasArrow>
                <AvatarGroup size="xs" max={5}>
                  <Avatar
                    name={vote.voter}
                    src={`https://images.hive.blog/u/${vote.voter}/avatar/small`}
                  />
                </AvatarGroup>
              </Tooltip>
            ))}
          </Flex>
        )}
        {/* Media and rest of content */}
        {showMedia && <Box>{renderedMedia}</Box>}
        {/* Inline composer, replies, etc. remain unchanged and can be added here if needed */}
      </Box>
      {/* Time Remaining Footer (always visible, above the main footer) */}
      {deadlineCountdown && (
        <Box px={4} pb={2} zIndex={2} textAlign="center" flexShrink={0}>
          <Text fontSize="md" fontWeight="bold">
            {deadlineCountdown}
          </Text>
        </Box>
      )}
      {/* Footer (always visible at the bottom) */}
      {!disableFooter && (
        <Box
          px={4}
          pb={4}
          zIndex={1}
          height="70px"
          flexShrink={0}
          pointerEvents={disableCardClick ? "auto" : undefined}
        >
          <HStack justify="center" spacing={8} height="100%">
            <HStack>
              <Button
                variant="ghost"
                size="sm"
                p={1}
                minW={"auto"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSharePost();
                }}
                leftIcon={<FaLink size={16} color="gray" />}
                _hover={{ bg: "gray.700", borderRadius: "full" }}
              ></Button>
              <UpvoteButton
                discussion={discussion}
                voted={voted}
                setVoted={setVoted}
                activeVotes={activeVotes}
                setActiveVotes={setActiveVotes}
                showSlider={showSlider}
                setShowSlider={setShowSlider}
                onVoteSuccess={(estimatedValue) => {
                  if (estimatedValue) {
                    setRewardAmount((prev) =>
                      parseFloat((prev + estimatedValue).toFixed(3))
                    );
                  }
                }}
                estimateVoteValue={estimateVoteValue}
                variant="withSlider"
                size="sm"
              />
            </HStack>
          </HStack>
        </Box>
      )}
    </Box>
  );
};

const BountySnapWithPulse = (props: BountySnapProps) => {
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
      `}</style>
      <BountySnap {...props} />
    </>
  );
};

export default BountySnapWithPulse; 