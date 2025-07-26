import {
  Box,
  Text,
  HStack,
  Button,
  Avatar,
  Link,
  VStack,
  Tooltip,
  useToast,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  useDisclosure,
  IconButton,
  MenuButton,
  MenuItem,
  Menu,
  MenuList,
} from "@chakra-ui/react";
import { Discussion } from "@hiveio/dhive";
import { FaRegComment } from "react-icons/fa";
import { useAioha } from "@aioha/react-ui";
import { useState, useMemo } from "react";
import { getPayoutValue } from "@/lib/hive/client-functions";
import { EnhancedMarkdownRenderer } from "@/components/markdown/EnhancedMarkdownRenderer";
import { getPostDate } from "@/lib/utils/GetPostDate";
import useHiveAccount from "@/hooks/useHiveAccount";
import VideoRenderer from "../layout/VideoRenderer";
import SnapComposer from "./SnapComposer";
import { UpvoteButton } from "@/components/shared";
import EditPostModal from "./EditPostModal";
import ShareMenuButtons from "./ShareMenuButtons";
import useHivePower from "@/hooks/useHivePower";
import { fetchComments } from "@/lib/hive/fetchComments";
import { separateContent } from "@/lib/utils/snapUtils";
import { SlPencil } from "react-icons/sl";
import { usePostEdit } from "@/hooks/usePostEdit";
import {
  parsePayout,
  calculatePayoutDays,
  deduplicateVotes,
} from "@/lib/utils/postUtils";
import { BiDotsHorizontal } from "react-icons/bi";
import MediaCarousel from "../shared/MediaCarousel";

interface MediaItem {
  type: "image" | "video" | "iframe";
  content: string;
  src?: string;
}

const parseMediaContent = (mediaContent: string): MediaItem[] => {
  const mediaItems: MediaItem[] = [];

  mediaContent.split("\n").forEach((item: string) => {
    const trimmedItem = item.trim();
    if (!trimmedItem) return;

    // Handle markdown images with IPFS
    if (
      trimmedItem.includes("![") &&
      trimmedItem.includes("ipfs.skatehive.app/ipfs/")
    ) {
      mediaItems.push({
        type: "image",
        content: trimmedItem,
      });
      return;
    }

    // Handle other markdown images
    if (
      trimmedItem.includes("![") &&
      (trimmedItem.includes("http") || trimmedItem.includes("ipfs:"))
    ) {
      mediaItems.push({
        type: "image",
        content: trimmedItem,
      });
      return;
    }

    // Handle iframes
    if (trimmedItem.includes("<iframe") && trimmedItem.includes("</iframe>")) {
      const srcMatch = trimmedItem.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        const url = srcMatch[1];

        // Skip YouTube iframes (handled by auto-embed logic)
        if (
          url.includes("youtube.com/embed/") ||
          url.includes("youtube-nocookie.com/embed/") ||
          url.includes("youtu.be/")
        ) {
          return;
        }

        // Handle IPFS videos
        if (url.includes("gateway.pinata.cloud/ipfs/")) {
          const ipfsHash = url.match(/\/ipfs\/([\w-]+)/)?.[1];
          if (ipfsHash) {
            const skatehiveUrl = `https://ipfs.skatehive.app/ipfs/${ipfsHash}`;
            mediaItems.push({
              type: "video",
              content: trimmedItem,
              src: skatehiveUrl,
            });
            return;
          }
        } else if (url.includes("ipfs.skatehive.app/ipfs/")) {
          mediaItems.push({
            type: "video",
            content: trimmedItem,
            src: url,
          });
          return;
        }
      }

      // Other iframes
      mediaItems.push({
        type: "iframe",
        content: trimmedItem,
      });
      return;
    }
  });

  return mediaItems;
};

const renderMedia = (mediaContent: string) => {
  const mediaItems = parseMediaContent(mediaContent);

  // If we have 2 or more media items, use carousel
  if (mediaItems.length >= 2) {
    return <MediaCarousel mediaItems={mediaItems} />;
  }

  // If we have only one item, render it directly with the original styling
  if (mediaItems.length === 1) {
    const item = mediaItems[0];

    if (item.type === "image") {
      return (
        <Box
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
          <EnhancedMarkdownRenderer content={item.content} />
        </Box>
      );
    }

    if (item.type === "video" && item.src) {
      return <VideoRenderer src={item.src} />;
    }

    if (item.type === "iframe") {
      return (
        <Box
          dangerouslySetInnerHTML={{ __html: item.content }}
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
  }

  return null;
};

interface SnapProps {
  discussion: Discussion;
  onOpen: () => void;
  setReply: (discussion: Discussion) => void;
  setConversation?: (conversation: Discussion) => void;
  onCommentAdded?: () => void;
}

const Snap = ({ discussion, onOpen, setReply, setConversation, onCommentAdded }: SnapProps) => {
  const { user } = useAioha();
  const {
    hivePower,
    isLoading: isHivePowerLoading,
    error: hivePowerError,
    estimateVoteValue,
  } = useHivePower(user);
  const commentDate = getPostDate(discussion.created);

  // Use the custom hook for edit functionality
  const {
    isEditing,
    editedContent,
    isSaving,
    setEditedContent,
    handleEditClick,
    handleCancelEdit,
    handleSaveEdit,
  } = usePostEdit(discussion);

  const [showSlider, setShowSlider] = useState(false);
  const [activeVotes, setActiveVotes] = useState(discussion.active_votes || []);
  const [rewardAmount, setRewardAmount] = useState(
    parseFloat(getPayoutValue(discussion))
  );
  const [inlineRepliesMap, setInlineRepliesMap] = useState<
    Record<string, Discussion[]>
  >({});
  const [inlineRepliesLoading, setInlineRepliesLoading] = useState<
    Record<string, boolean>
  >({});
  const [inlineComposerStates, setInlineComposerStates] = useState<
    Record<string, boolean>
  >({});
  
  // State to track comment count for optimistic updates
  const [commentCount, setCommentCount] = useState(discussion.children ?? 0);

  const effectiveDepth = discussion.depth || 0;

  const { text, media } = useMemo(
    () => separateContent(discussion.body),
    [discussion.body]
  );
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

  function handleInlineNewReply(newComment: Partial<Discussion>) {
    const newReply = newComment as Discussion;
    setInlineRepliesMap((prev) => ({
      ...prev,
      [discussion.permlink]: [...(prev[discussion.permlink] || []), newReply],
    }));
    // Update comment count optimistically
    setCommentCount((prev) => prev + 1);
    // Notify parent component if callback is provided
    if (onCommentAdded) {
      onCommentAdded();
    }
  }

  async function handleReplyButtonClick(permlink: string) {
    setInlineComposerStates((prev: Record<string, boolean>) => ({
      ...prev,
      [permlink]: !prev[permlink],
    }));
    // If opening, fetch replies if not already loaded
    if (!inlineComposerStates[permlink]) {
      setInlineRepliesLoading((prev) => ({ ...prev, [permlink]: true }));
      try {
        const replies = await fetchRepliesForPermlink(
          discussion.author,
          permlink
        );
        setInlineRepliesMap((prev) => ({ ...prev, [permlink]: replies }));
      } catch (e) {
        setInlineRepliesMap((prev) => ({ ...prev, [permlink]: [] }));
      } finally {
        setInlineRepliesLoading((prev) => ({ ...prev, [permlink]: false }));
      }
    }
  }

  // Helper to fetch replies for a given author/permlink
  async function fetchRepliesForPermlink(author: string, permlink: string) {
    return fetchComments(author, permlink, false);
  }

  // Deduplicate votes by voter (keep the last occurrence)
  const uniqueVotes = deduplicateVotes(activeVotes);

  const authorPayout = parsePayout(discussion.total_payout_value);
  const curatorPayout = parsePayout(discussion.curator_payout_value);
  const { daysRemaining, isPending } = calculatePayoutDays(discussion.created);
  const {
    isOpen: isPayoutOpen,
    onOpen: openPayout,
    onClose: closePayout,
  } = useDisclosure();

  return (
    <Box pl={effectiveDepth > 1 ? 1 : 0} ml={effectiveDepth > 1 ? 2 : 0}>
      <Box mt={1} mb={1} borderRadius="base" width="100%">
        <HStack mb={2}>
          <Link
            href={`/user/${discussion.author}`}
            _hover={{ textDecoration: "none" }}
            display="flex"
            alignItems="center"
            role="group"
          >
            <Avatar
              size="sm"
              name={discussion.author}
              src={`https://images.hive.blog/u/${discussion.author}/avatar/sm`}
              ml={2}
            />
            <Text
              fontWeight="medium"
              fontSize="sm"
              ml={2}
              whiteSpace="nowrap"
              _groupHover={{ textDecoration: "underline" }}
            >
              {discussion.author}
            </Text>
          </Link>
          <HStack ml={0} width="100%" justify="space-between">
            <HStack>
              <Text fontWeight="medium" fontSize="sm" color="gray">
                · {commentDate}
              </Text>
            </HStack>
          </HStack>
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Edit post"
              icon={<BiDotsHorizontal />}
              size="sm"
              variant="ghost"
              _active={{ bg: "none" }}
              _hover={{ bg: "none" }}
              bg={"background"}
              color={"primary"}
            />
            <MenuList bg={"background"} color={"primary"}>
              {user === discussion.author && (
                <MenuItem
                  onClick={handleEditClick}
                  bg={"background"}
                  color={"primary"}
                >
                  <SlPencil style={{ marginRight: "8px" }} />
                  Edit
                </MenuItem>
              )}
              <ShareMenuButtons
                comment={{
                  author: discussion.author,
                  permlink: discussion.permlink,
                }}
              />
            </MenuList>
          </Menu>
        </HStack>
        <Box>
          <Box
            sx={{
              p: { marginBottom: "1rem", lineHeight: "1.6", marginLeft: "4" },
            }}
          >
            <EnhancedMarkdownRenderer content={text} />
          </Box>
          <Box>{renderedMedia}</Box>
        </Box>

        {/* Edit Modal */}
        <EditPostModal
          isOpen={isEditing}
          onClose={handleCancelEdit}
          discussion={discussion}
          editedContent={editedContent}
          setEditedContent={setEditedContent}
          onSave={handleSaveEdit}
          isSaving={isSaving}
        />

        {!showSlider && (
          <HStack justify="center" spacing={8} mt={3}>
            <UpvoteButton
              discussion={discussion}
              voted={voted}
              setVoted={setVoted}
              activeVotes={activeVotes}
              setActiveVotes={setActiveVotes}
              showSlider={showSlider}
              setShowSlider={setShowSlider}
              onVoteSuccess={(estimatedValue?: number) => {
                setVoted(true);
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
            <HStack>
              <Tooltip label="comments" hasArrow openDelay={1000}>
                <Button
                  leftIcon={<FaRegComment size={18} />}
                  variant="ghost"
                  onClick={() => {
                    if (effectiveDepth > 0) {
                      handleReplyButtonClick(discussion.permlink);
                    } else {
                      handleConversation();
                    }
                  }}
                  size="sm"
                  _hover={{ bg: "secondary" }}
                >
                  {commentCount}
                </Button>
              </Tooltip>
            </HStack>
            <Tooltip label="reward amount" hasArrow openDelay={1000}>
              <Popover
                placement="top"
                isOpen={isPayoutOpen}
                onClose={closePayout}
                closeOnBlur={true}
              >
                <PopoverTrigger>
                  <span
                    style={{ cursor: "pointer" }}
                    onMouseDown={openPayout}
                    onMouseUp={closePayout}
                  >
                    <Text fontWeight="bold" fontSize="xl">
                      ${rewardAmount.toFixed(2)}
                    </Text>
                  </span>
                </PopoverTrigger>
                <PopoverContent
                  w="auto"
                  bg="gray.800"
                  color="white"
                  borderRadius="md"
                  boxShadow="lg"
                  p={2}
                >
                  <PopoverArrow />
                  <PopoverBody>
                    {isPending ? (
                      <div>
                        <div>
                          <b>Pending</b>
                        </div>
                        <div>
                          {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}{" "}
                          until payout
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          Author: <b>${authorPayout.toFixed(3)}</b>
                        </div>
                        <div>
                          Curators: <b>${curatorPayout.toFixed(3)}</b>
                        </div>
                      </>
                    )}
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </Tooltip>
          </HStack>
        )}

        {showSlider && (
          <UpvoteButton
            discussion={discussion}
            voted={voted}
            setVoted={setVoted}
            activeVotes={activeVotes}
            setActiveVotes={setActiveVotes}
            showSlider={showSlider}
            setShowSlider={setShowSlider}
            onVoteSuccess={(estimatedValue?: number) => {
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
        )}
        {inlineComposerStates[discussion.permlink] && (
          <Box mt={2}>
            <SnapComposer
              pa={discussion.author}
              pp={discussion.permlink}
              onNewComment={handleInlineNewReply}
              onClose={() =>
                setInlineComposerStates((prev: Record<string, boolean>) => ({
                  ...prev,
                  [discussion.permlink]: false,
                }))
              }
              post
            />
            {/* Replies loading indicator */}
            {inlineRepliesLoading[discussion.permlink] && (
              <Text mt={2} color="gray.400" fontSize="sm">
                Loading replies...
              </Text>
            )}
            {/* Show replies for this permlink */}
            {inlineRepliesMap[discussion.permlink] &&
              inlineRepliesMap[discussion.permlink].length > 0 && (
                <VStack spacing={2} align="stretch" mt={2}>
                  {inlineRepliesMap[discussion.permlink].map(
                    (reply: Discussion) => {
                      const nextDepth = effectiveDepth + 1;
                      return (
                        <Snap
                          key={reply.permlink}
                          discussion={{ ...reply, depth: nextDepth } as any}
                          onOpen={onOpen}
                          setReply={setReply}
                          setConversation={setConversation}
                        />
                      );
                    }
                  )}
                </VStack>
              )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Snap;

<style jsx global>{`
  .pulse-green {
    animation: pulse-green 1.5s infinite;
    background: var(--chakra-colors-primary, #38ff8e);
    color: var(--chakra-colors-background, black);
    font-weight: bold;
    border: none;
  }
  @keyframes pulse-green {
    0% {
      box-shadow: 0 0 0 0 var(--chakra-colors-accent, rgba(72, 255, 128, 0.7));
    }
    70% {
      box-shadow: 0 0 0 10px var(--chakra-colors-accent, rgba(72, 255, 128, 0));
    }
    100% {
      box-shadow: 0 0 0 0 var(--chakra-colors-accent, rgba(72, 255, 128, 0));
    }
  }
  /* Media Carousel Styles */
  .media-carousel {
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
  }
  .media-carousel .swiper-button-next,
  .media-carousel .swiper-button-prev {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    margin-top: -20px;
  }
  .media-carousel .swiper-button-next:after,
  .media-carousel .swiper-button-prev:after {
    font-size: 16px;
    font-weight: bold;
  }
  .media-carousel .swiper-pagination {
    bottom: 10px;
  }
  .media-carousel .swiper-pagination-bullet {
    background: rgba(255, 255, 255, 0.7);
    opacity: 1;
  }
  .media-carousel .swiper-pagination-bullet-active {
    background: var(--chakra-colors-primary, #38ff8e);
  }
  .media-carousel .swiper-slide {
    display: flex;
    justify-content: center;
    align-items: center;
  }
`}</style>;
