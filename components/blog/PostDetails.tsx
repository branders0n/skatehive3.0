import {
  Box,
  Text,
  Avatar,
  Flex,
  Icon,
  Button,
  Link,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  Image,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  useToast,
  IconButton,
  HStack,
  Textarea,
} from "@chakra-ui/react";
import React, { useState, useRef, useMemo, useCallback } from "react";
import { Discussion } from "@hiveio/dhive";
import { FaHeart, FaRegHeart, FaShareSquare, FaEdit } from "react-icons/fa";
import { getPostDate } from "@/lib/utils/GetPostDate";
import { useAioha } from "@aioha/react-ui";
import { getPayoutValue } from "@/lib/hive/client-functions";
import useHivePower from "@/hooks/useHivePower";
import VoteListPopover from "./VoteListModal";
import { MarkdownProcessor } from "@/lib/markdown/MarkdownProcessor";
import { EnhancedMarkdownRenderer } from "@/components/markdown/EnhancedMarkdownRenderer";
import { usePostEdit } from "@/hooks/usePostEdit";
import ThumbnailPicker from "@/components/compose/ThumbnailPicker";
import { DEFAULT_VOTE_WEIGHT } from "@/lib/utils/constants";

interface PostDetailsProps {
  post: Discussion;
  onOpenConversation: () => void;
}

export default function PostDetails({
  post,
  onOpenConversation,
}: PostDetailsProps) {
  const { title, author, body, created } = post;
  const postDate = useMemo(() => getPostDate(created), [created]);
  const { aioha, user } = useAioha();
  const [sliderValue, setSliderValue] = useState(DEFAULT_VOTE_WEIGHT);
  const [showSlider, setShowSlider] = useState(false);
  const [activeVotes, setActiveVotes] = useState(post.active_votes || []);
  const [payoutValue, setPayoutValue] = useState(
    parseFloat(getPayoutValue(post))
  );
  const [voted, setVoted] = useState(
    post.active_votes?.some(
      (item) => item.voter.toLowerCase() === user?.toLowerCase()
    )
  );
  const toast = useToast();

  // Check if current user is the author
  const isAuthor = user && user.toLowerCase() === author.toLowerCase();

  // Use the post edit hook
  const {
    isEditing,
    editedContent,
    isSaving,
    selectedThumbnail,
    setEditedContent,
    setSelectedThumbnail,
    handleEditClick,
    handleCancelEdit,
    handleSaveEdit,
  } = usePostEdit(post);

  const {
    hivePower,
    isLoading: isHivePowerLoading,
    error: hivePowerError,
    estimateVoteValue,
  } = useHivePower(user);

  // Process markdown content once
  const processedMarkdown = useMemo(() => {
    const contentToProcess = isEditing ? editedContent : body;
    return MarkdownProcessor.process(contentToProcess);
  }, [body, editedContent, isEditing]);

  // Memoize payout calculations
  const payoutData = useMemo(() => {
    const createdDate = new Date(post.created);
    const now = new Date();
    const timeDifferenceInMs = now.getTime() - createdDate.getTime();
    const timeDifferenceInDays = timeDifferenceInMs / (1000 * 60 * 60 * 24);
    const isPending = timeDifferenceInDays < 7;
    const daysRemaining = isPending
      ? Math.max(0, 7 - Math.floor(timeDifferenceInDays))
      : 0;

    const assetToString = (val: string | { toString: () => string }): string =>
      typeof val === "string" ? val : val.toString();

    const parsePayout = (
      val: string | { toString: () => string } | undefined
    ): number => {
      if (!val) return 0;
      const str = assetToString(val);
      return parseFloat(str.replace(" HBD", "").replace(",", ""));
    };

    return {
      isPending,
      daysRemaining,
      authorPayout: parsePayout(post.total_payout_value),
      curatorPayout: parsePayout(post.curator_payout_value),
    };
  }, [post.created, post.total_payout_value, post.curator_payout_value]);

  // Compose gradient and box shadows using theme color names directly
  const boxShadowAccent = `0 0 0 0 var(--chakra-colors-accent, #48BB78B3)`;

  const markdownRef = useRef<HTMLDivElement>(null);

  // Popover state for payout split
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const openPayout = useCallback(() => setIsPayoutOpen(true), []);
  const closePayout = useCallback(() => setIsPayoutOpen(false), []);

  // Memoize event handlers
  const handleHeartClick = useCallback(() => {
    setShowSlider(!showSlider);
  }, [showSlider]);

  const handleShare = useCallback(async () => {
    const postUrl = `${window.location.origin}/post/${author}/${post.permlink}`;

    try {
      await navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link copied!",
        description: "Post URL has been copied to clipboard",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy URL to clipboard",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  }, [author, post.permlink, toast]);

  const handleVote = useCallback(async () => {
    const vote = await aioha.vote(
      post.author,
      post.permlink,
      sliderValue * 100
    );
    if (vote.success) {
      setVoted(true);
      setActiveVotes([...activeVotes, { voter: user }]);
      // Estimate the value and optimistically update payout
      if (estimateVoteValue) {
        try {
          const estimatedValue = await estimateVoteValue(sliderValue);
          setPayoutValue((prev) => prev + estimatedValue);
        } catch (e) {
          // fallback: do not update payout
        }
      }
    }
    setShowSlider(false);
  }, [
    aioha,
    post.author,
    post.permlink,
    sliderValue,
    activeVotes,
    user,
    estimateVoteValue,
  ]);

  return (
    <Box
      data-component="PostDetails"
      borderRadius="base"
      overflow="hidden"
      bg="muted"
      mb={3}
      p={4}
      w="100%"
      mt={{ base: "0px", md: "10px" }}
    >
      <Flex
        data-subcomponent="PostDetails/Header"
        direction="column"
        bg={"background"}
        p={2}
        mb={2}
        border={"1px solid"}
        borderColor={"primary"}
      >
        {/* Mobile and Desktop layouts */}
        <Box display={["block", "none"]}>
          {/* Mobile Layout - Two rows */}
          <Flex
            direction="row"
            alignItems="center"
            w="100%"
            justifyContent="space-between"
            mb={2}
          >
            <Flex direction="row" alignItems="center" flex="0 0 auto" minW="0">
              <Avatar
                size="sm"
                name={author}
                src={`https://images.hive.blog/u/${author}/avatar/sm`}
              />
              <Box ml={2} minW="0">
                <Text
                  fontWeight="medium"
                  fontSize="sm"
                  mb={-1}
                  color="colorBackground"
                  isTruncated
                >
                  <Link href={`/user/${author}`} color="colorBackground">
                    @{author}
                  </Link>
                </Text>
              </Box>
            </Flex>

            <Flex
              alignItems="center"
              gap={1}
              flex="0 0 auto"
              justifyContent="flex-end"
            >
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
                    <Text fontWeight="bold" color="primary" fontSize="sm">
                      ${payoutValue.toFixed(2)}
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
                    {payoutData.isPending ? (
                      <div>
                        <div>
                          <b>Pending</b>
                        </div>
                        <div>
                          {payoutData.daysRemaining} day
                          {payoutData.daysRemaining !== 1 ? "s" : ""} until
                          payout
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          Author: <b>${payoutData.authorPayout.toFixed(3)}</b>
                        </div>
                        <div>
                          Curators:{" "}
                          <b>${payoutData.curatorPayout.toFixed(3)}</b>
                        </div>
                      </>
                    )}
                  </PopoverBody>
                </PopoverContent>
              </Popover>
              <Divider orientation="vertical" h="20px" mx={2} />
              <IconButton
                aria-label="Share post"
                icon={<FaShareSquare />}
                size="sm"
                variant="ghost"
                color="primary"
                onClick={handleShare}
                _hover={{ bg: "transparent", color: "accent" }}
                fontSize="14px"
                minW="auto"
                h="auto"
                p={1}
              />
              {isAuthor && (
                <IconButton
                  aria-label="Edit post"
                  icon={<FaEdit />}
                  size="sm"
                  variant="ghost"
                  color="primary"
                  onClick={handleEditClick}
                  _hover={{ bg: "transparent", color: "accent" }}
                  fontSize="14px"
                  minW="auto"
                  h="auto"
                  p={1}
                />
              )}
              {voted ? (
                <Icon
                  as={FaHeart}
                  onClick={handleHeartClick}
                  cursor="pointer"
                  color={"red"}
                  boxSize="14px"
                />
              ) : (
                <Icon
                  as={FaRegHeart}
                  onClick={handleHeartClick}
                  cursor="pointer"
                  color="primary"
                  opacity={0.5}
                  boxSize="14px"
                />
              )}
              <VoteListPopover
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    minW="auto"
                    px={1}
                    _active={{ bg: "transparent" }}
                    color={voted ? "red" : "primary"}
                    _hover={{ textDecoration: "underline" }}
                    fontSize="sm"
                    h="auto"
                    p={1}
                  >
                    {activeVotes.length}
                  </Button>
                }
                votes={activeVotes}
                post={post}
              />
            </Flex>
          </Flex>

          {/* Mobile Title Row */}
          <Box w="100%" mt={1}>
            <Text
              fontSize="lg"
              fontWeight="bold"
              color="colorBackground"
              lineHeight="1.3"
              noOfLines={2}
            >
              {title}
            </Text>
          </Box>
        </Box>

        {/* Desktop Layout - Two rows like mobile */}
        <Flex
          direction="row"
          alignItems="center"
          w="100%"
          justifyContent="space-between"
          display={["none", "flex"]}
          mb={2}
        >
          <Flex direction="row" alignItems="center" flex="0 0 auto" minW="0">
            <Avatar
              size="sm"
              name={author}
              src={`https://images.hive.blog/u/${author}/avatar/sm`}
            />
            <HStack ml={2} minW="0">
              <Text
                fontWeight="medium"
                fontSize="sm"
                color="colorBackground"
                isTruncated
              >
                <Link href={`/user/${author}`} color="colorBackground">
                  @{author}
                </Link>
              </Text>
              <Text fontSize="sm" color="colorBackground">
                - {postDate} ago
              </Text>
            </HStack>
          </Flex>

          <Flex
            alignItems="center"
            gap={2}
            flex="0 0 auto"
            justifyContent="flex-end"
          >
            <Popover
              placement="top"
              isOpen={isPayoutOpen}
              onClose={closePayout}
            >
              <PopoverTrigger>
                <span
                  style={{ cursor: "pointer" }}
                  onMouseDown={openPayout}
                  onMouseUp={closePayout}
                >
                  <Text fontWeight="bold" color="primary" fontSize="xs" mt={1}>
                    ${payoutValue.toFixed(2)}
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
                  {payoutData.isPending ? (
                    <div>
                      <div>
                        <b>Pending</b>
                      </div>
                      <div>
                        {payoutData.daysRemaining} day
                        {payoutData.daysRemaining !== 1 ? "s" : ""} until payout
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        Author: <b>${payoutData.authorPayout.toFixed(3)}</b>
                      </div>
                      <div>
                        Curators: <b>${payoutData.curatorPayout.toFixed(3)}</b>
                      </div>
                    </>
                  )}
                </PopoverBody>
              </PopoverContent>
            </Popover>
            <Divider orientation="vertical" h="20px" mx={2} />
            <IconButton
              aria-label="Share post"
              icon={<FaShareSquare />}
              size="sm"
              variant="ghost"
              color="primary"
              onClick={handleShare}
              _hover={{ bg: "transparent", color: "accent" }}
              fontSize="14px"
              minW="auto"
              h="auto"
              p={1}
            />
            {isAuthor && (
              <IconButton
                aria-label="Edit post"
                icon={<FaEdit />}
                size="sm"
                variant="ghost"
                color="primary"
                onClick={handleEditClick}
                _hover={{ bg: "transparent", color: "accent" }}
                fontSize="14px"
                minW="auto"
                h="auto"
                p={1}
              />
            )}
            <IconButton
              aria-label={voted ? "Unvote" : "Vote"}
              icon={voted ? <FaHeart /> : <FaRegHeart />}
              size="sm"
              variant="ghost"
              color={voted ? "accent" : "muted"}
              onClick={handleHeartClick}
              _hover={{ bg: "transparent", color: "accent" }}
              fontSize="14px"
              minW="auto"
              h="auto"
              p={1}
              mr={-2}
            />

            <VoteListPopover
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  minW="auto"
                  px={1}
                  _active={{ bg: "transparent" }}
                  color={voted ? "accent" : "muted"}
                  _hover={{ textDecoration: "underline" }}
                  fontSize="xs"
                  h="auto"
                  p={1}
                >
                  {activeVotes.length}
                </Button>
              }
              votes={activeVotes}
              post={post}
            />
          </Flex>
        </Flex>

        {/* Desktop Title Row */}
        <Box w="100%" display={["none", "block"]}>
          <Text
            fontSize="lg"
            fontWeight="bold"
            color="colorBackground"
            lineHeight="1.3"
            noOfLines={2}
          >
            {title}
          </Text>
        </Box>
        {showSlider ? (
          <Flex
            data-subcomponent="PostDetails/VoteControls"
            mt={2}
            alignItems="center"
            w="100%"
          >
            <Box width="100%" mr={2}>
              <Slider
                aria-label="slider-ex-1"
                min={0}
                max={100}
                value={sliderValue}
                onChange={(val) => setSliderValue(val)}
              >
                <SliderTrack
                  bg="muted"
                  height="8px"
                  boxShadow={boxShadowAccent}
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
              size="xs"
              onClick={handleVote}
              bgGradient="linear(to-r, primary, accent)"
              color="background"
              _hover={{ bg: "accent" }}
              fontWeight="bold"
              className="subtle-pulse"
            >
              &nbsp;&nbsp;&nbsp;Vote {sliderValue} %&nbsp;&nbsp;&nbsp;
            </Button>
            <Button
              size="xs"
              onClick={handleHeartClick}
              ml={2}
              bg="muted"
              color="primary"
              _hover={{ bg: "muted", opacity: 0.8 }}
            >
              X
            </Button>
          </Flex>
        ) : null}
      </Flex>

      <Divider />

      <Box
        mt={4}
        ref={markdownRef}
        maxHeight="1000px"
        overflowY="auto"
        css={{
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "var(--chakra-colors-muted)",
            borderRadius: "2px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "var(--chakra-colors-primary)",
            borderRadius: "2px",
            border: "1px solid var(--chakra-colors-background)",
            cursor: "grab",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "var(--chakra-colors-accent)",
            cursor: "grabbing",
          },
          // Firefox scrollbar
          scrollbarWidth: "thin",
          scrollbarColor:
            "var(--chakra-colors-primary) var(--chakra-colors-muted)",
        }}
      >
        {isEditing ? (
          <Box>
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              minHeight="400px"
              maxHeight="700px"
              bg="background"
              border="1px solid"
              borderColor="primary"
              color="colorBackground"
              _focus={{ borderColor: "accent" }}
              resize="vertical"
              fontFamily="monospace"
              fontSize="sm"
              css={{
                "&::-webkit-scrollbar": {
                  width: "none",
                },
                scrollbarWidth: "none",
              }}
            />

            {/* Thumbnail Picker */}
            <Box mt={4}>
              <ThumbnailPicker
                show={true}
                markdown={editedContent}
                selectedThumbnail={selectedThumbnail}
                setSelectedThumbnail={setSelectedThumbnail}
              />
            </Box>

            <Flex mt={3} gap={2} justifyContent="flex-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                color="muted"
                _hover={{ bg: "transparent", color: "primary" }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                isLoading={isSaving}
                loadingText="Saving..."
                bgGradient="linear(to-r, primary, accent)"
                color="background"
                _hover={{ bg: "accent" }}
                fontWeight="bold"
              >
                Save Changes
              </Button>
            </Flex>
          </Box>
        ) : (
          <EnhancedMarkdownRenderer
            content={processedMarkdown.contentWithPlaceholders}
          />
        )}
      </Box>
    </Box>
  );
}
