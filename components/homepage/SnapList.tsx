import React, { useState, useEffect } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Box, Spinner, VStack } from "@chakra-ui/react";
import Snap from "./Snap";
import SnapComposer from "./SnapComposer";
import { Discussion } from "@hiveio/dhive"; // Add this import for consistency
import LogoMatrix from "../graphics/LogoMatrix";
import UpvoteSnapContainer from "./UpvoteSnapContainer";
import { countDownvotes } from "@/lib/utils/postUtils";

interface SnapListProps {
  author: string;
  permlink: string;
  setConversation: (conversation: Discussion) => void;
  onOpen: () => void;
  setReply: (reply: Discussion) => void;
  newComment: Discussion | null;
  setNewComment: (Discussion: Discussion | null) => void;
  post?: boolean;
  data: InfiniteScrollData;
  hideComposer?: boolean;
}

interface InfiniteScrollData {
  comments: Discussion[];
  loadNextPage: () => void; // Default can be an empty function in usage
  isLoading: boolean;
  hasMore: boolean; // Default can be `false` in usage
}

export default function SnapList({
  author,
  permlink,
  setConversation,
  onOpen,
  setReply,
  newComment,
  setNewComment,
  post = false,
  data,
  hideComposer = false,
}: SnapListProps) {
  const { comments, loadNextPage, isLoading, hasMore } = data;
  const [displayedComments, setDisplayedComments] = useState<Discussion[]>([]);

  // Mounted state
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Update displayed comments when data.comments changes or newComment is added
  useEffect(() => {
    if (comments) {
      setDisplayedComments([...comments]);
    }
  }, [comments]);

  useEffect(() => {
    if (newComment) {
      setDisplayedComments((prevComments) => {
        const exists = prevComments.some(
          (c) => c.permlink === (newComment as any).permlink
        );
        if (!exists) {
          return [newComment as unknown as Discussion, ...prevComments];
        }
        return prevComments;
      });
    }
  }, [newComment]);

  const handleNewComment = (newComment: Partial<Discussion>) => {
    if (typeof setNewComment === "function") {
      setNewComment(newComment as unknown as Discussion);
    } else {
      console.warn("setNewComment is not a function");
      setDisplayedComments((prev) => [
        newComment as unknown as Discussion,
        ...prev,
      ]);
    }
  };

  // Callback to update comment count when a new comment is added to the main post
  const handleMainPostCommentAdded = () => {
    // This will be called when a comment is added to the main post
    // The count is already updated optimistically in the Snap component
  };

  // Filter out posts with 2 or more downvotes (community disapproval)
  // This helps maintain content quality by hiding posts the community has rejected
  const filteredAndSortedComments = [...displayedComments]
    .filter((discussion: Discussion) => {
      const downvoteCount = countDownvotes(discussion.active_votes);
      // Filter out posts with 2 or more downvotes (community disapproval)
      const shouldShow = downvoteCount < 2;
      if (!shouldShow) {
        console.log(
          `❌ FILTERING OUT post by ${discussion.author} due to ${downvoteCount} downvotes`
        );
      }
      return shouldShow;
    })
    .sort((a: Discussion, b: Discussion) => {
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });

  // Conditionally render after all hooks have run
  if (!hasMounted) return null;

  return (
    <VStack spacing={1} align="stretch" mx="auto">
      {isLoading && filteredAndSortedComments.length === 0 ? (
        <Box textAlign="center" mt={-1}>
          <LogoMatrix />
        </Box>
      ) : (
        <>
          {!hideComposer && (
            <SnapComposer
              pa={author}
              pp={permlink}
              onNewComment={
                handleNewComment as (newComment: Partial<Discussion>) => void
              } // Cast handler to expected type
              onClose={() => null}
            />
          )}

          <UpvoteSnapContainer hideIfVoted />

          <InfiniteScroll
            dataLength={filteredAndSortedComments.length}
            next={loadNextPage}
            hasMore={hasMore}
            loader={
              <Box textAlign="center" mt={4}>
                {/* Changed the spinner to LoadingComponent */}
                <Spinner />
              </Box>
            }
            scrollableTarget="scrollableDiv"
          >
            <VStack spacing={1} align="stretch">
              {filteredAndSortedComments.map((discussion: Discussion) => (
                <Snap
                  key={discussion.permlink}
                  discussion={discussion}
                  onOpen={onOpen}
                  setReply={setReply}
                  {...(!post ? { setConversation } : {})}
                />
              ))}
            </VStack>
          </InfiniteScroll>
        </>
      )}
    </VStack>
  );
}
