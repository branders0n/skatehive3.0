"use client";
import React, { useState, useMemo } from "react";
import {
  Box,
  Alert,
  AlertIcon,
  Flex,
  Container,
  Center,
} from "@chakra-ui/react";
import useHiveAccount from "@/hooks/useHiveAccount";
import LoadingComponent from "../homepage/loadingComponent";
import PostInfiniteScroll from "../blog/PostInfiniteScroll";
import { useAioha } from "@aioha/react-ui";
import EditProfile from "./EditProfile";
import { VideoPart } from "@/types/VideoPart";
import VideoPartsView from "./VideoPartsView";

// Import modular components
import ProfileCoverImage from "./ProfileCoverImage";
import ProfileHeader from "./ProfileHeader";
import ProfileActions from "./ProfileActions";
import ViewModeSelector from "./ViewModeSelector";
import MagazineModal from "./MagazineModal";
import SnapsGrid from "./SnapsGrid";

// Import custom hooks
import useProfileData from "@/hooks/useProfileData";
import useFollowStatus from "@/hooks/useFollowStatus";
import useProfilePosts from "@/hooks/useProfilePosts";
import useViewMode from "@/hooks/useViewMode";
import useIsMobile from "@/hooks/useIsMobile";

interface ProfilePageProps {
  username: string;
}

export interface ProfileData {
  profileImage: string;
  coverImage: string;
  website: string;
  name: string;
  followers: number;
  following: number;
  location: string;
  about: string;
  ethereum_address?: string;
  video_parts?: VideoPart[];
  vote_weight?: number;
}

export default function ProfilePage({ username }: ProfilePageProps) {
  const { hiveAccount, isLoading, error } = useHiveAccount(username);
  const { user } = useAioha();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Custom hooks
  const { profileData, updateProfileData } = useProfileData(username, hiveAccount);
  const { isFollowing, isFollowLoading, updateFollowing, updateLoading } = useFollowStatus(user, username);
  const { posts, fetchPosts } = useProfilePosts(username);
  const { viewMode, handleViewModeChange, closeMagazine } = useViewMode();
  const isMobile = useIsMobile();

  // Memoize derived values
  const isOwner = useMemo(() => user === username, [user, username]);

  // Modal handlers
  const handleEditModalOpen = () => setIsEditModalOpen(true);
  const handleEditModalClose = () => setIsEditModalOpen(false);

  if (isLoading || !hiveAccount) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <LoadingComponent />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Alert status="error" borderRadius="md" variant="solid">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <>
      {/* Magazine Modal */}
      <MagazineModal
        isOpen={viewMode === 'magazine'}
        onClose={closeMagazine}
        username={username}
      />
      <Center>
        <Container maxW="container.md" p={0} m={0}>
          {/* Main Profile Content */}
          <Box
            id="scrollableDiv"
            color="text"
            maxW="container.lg"
            mx="auto"
            p={0}
            m={0}
            maxH="100vh"
            overflowY="auto"
            sx={{
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
            }}
          >
            {/* Cover Image */}
            <ProfileCoverImage coverImage={profileData.coverImage} username={username} />

            {/* Profile Header */}
            <ProfileHeader
              profileData={profileData}
              username={username}
              isOwner={isOwner}
              user={user}
              isFollowing={isFollowing}
              isFollowLoading={isFollowLoading}
              onFollowingChange={updateFollowing}
              onLoadingChange={updateLoading}
              onEditModalOpen={handleEditModalOpen}
            />

            {/* Mobile-only Logout and Settings Buttons for Profile Owner */}
            <ProfileActions isOwner={isOwner} isMobile={isMobile} />

            {/* View Mode Selector */}
            <Flex justify="center" align="center" direction="column">
              <ViewModeSelector
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                isMobile={isMobile}
              />
            </Flex>

            {/* Content Views */}
            {viewMode !== "magazine" && viewMode !== "videoparts" && viewMode !== "snaps" && (
              <PostInfiniteScroll
                allPosts={posts}
                fetchPosts={fetchPosts}
                viewMode={viewMode as "grid" | "list"}
                context="profile"
                hideAuthorInfo={true}
              />
            )}
            {viewMode === "videoparts" && (
              <VideoPartsView profileData={profileData} username={username} onProfileUpdate={updateProfileData} />
            )}
            {viewMode === "snaps" && (
              <SnapsGrid
                username={username}
              />
            )}

            {/* Edit Profile Modal */}
            <EditProfile
              isOpen={isEditModalOpen}
              onClose={handleEditModalClose}
              profileData={profileData}
              onProfileUpdate={updateProfileData}
              username={username}
            />
          </Box>
        </Container>
      </Center>
    </>
  );
}
