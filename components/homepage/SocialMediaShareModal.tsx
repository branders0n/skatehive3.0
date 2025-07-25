import {
  MenuItem,
  useClipboard,
  useToast,
} from "@chakra-ui/react";
import { FaFacebook, FaTwitter, FaLink } from "react-icons/fa";
import React from "react";

// Custom Farcaster Icon Component
const FarcasterIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.24 0.24H5.76C2.5789 0.24 0 2.8188 0 6v12c0 3.1811 2.5789 5.76 5.76 5.76h12.48c3.1812 0 5.76 -2.5789 5.76 -5.76V6C24 2.8188 21.4212 0.24 18.24 0.24m0.8155 17.1662v0.504c0.2868 -0.0256 0.5458 0.1905 0.5439 0.479v0.5688h-5.1437v-0.5688c-0.0019 -0.2885 0.2576 -0.5047 0.5443 -0.479v-0.504c0 -0.22 0.1525 -0.402 0.358 -0.458l-0.0095 -4.3645c-0.1589 -1.7366 -1.6402 -3.0979 -3.4435 -3.0979 -1.8038 0 -3.2846 1.3613 -3.4435 3.0979l-0.0096 4.3578c0.2276 0.0424 0.5318 0.2083 0.5395 0.4648v0.504c0.2863 -0.0256 0.5457 0.1905 0.5438 0.479v0.5688H4.3915v-0.5688c-0.0019 -0.2885 0.2575 -0.5047 0.5438 -0.479v-0.504c0 -0.2529 0.2011 -0.4548 0.4536 -0.4724v-7.895h-0.4905L4.2898 7.008l2.6405 -0.0005V5.0419h9.9495v1.9656h2.8219l-0.6091 2.0314h-0.4901v7.8949c0.2519 0.0177 0.453 0.2195 0.453 0.4724" />
  </svg>
);

interface ShareMenuButtonsProps {
  comment: { author: string; permlink: string };
}

const ShareMenuButtons = ({
  comment,
}: ShareMenuButtonsProps) => {
  const { onCopy } = useClipboard(
    `${typeof window !== "undefined" ? window.location.origin : ""}/post/${comment.author}/${comment.permlink}`
  );
  const toast = useToast();

  // Validate permlink to prevent [object Object] URLs
  if (typeof comment.permlink !== "string") {
    console.error(
      "🚨 ShareMenuButtons: Invalid permlink type:",
      typeof comment.permlink
    );
    return null; // Prevent rendering with invalid data
  }

  const postLink = `${typeof window !== "undefined" ? window.location.origin : ""
    }/post/${comment.author}/${comment.permlink}`;

  const handleShare = (platform: string) => {
    let shareUrl = "";
    if (platform === "facebook") {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        postLink
      )}`;
    } else if (platform === "x") {
      shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        postLink
      )}`;
    } else if (platform === "farcaster") {
      shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(postLink)}`;
    }

    if (platform === "copy") {
      onCopy();
      toast({
        title: "URL copied to clipboard!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } else {
      window.open(shareUrl, "_blank");
    }
  };

  return (
    <>
      <MenuItem onClick={() => handleShare("facebook")}>
        <FaFacebook style={{ marginRight: '8px' }} />
        Share on Facebook
      </MenuItem>
      <MenuItem onClick={() => handleShare("x")}>
        <FaTwitter style={{ marginRight: '8px' }} />
        Share on X
      </MenuItem>
      <MenuItem onClick={() => handleShare("farcaster")}>
        <FarcasterIcon size={16} />
        <span style={{ marginLeft: '8px' }}>Share on Farcaster</span>
      </MenuItem>
      <MenuItem onClick={() => handleShare("copy")}>
        <FaLink style={{ marginRight: '8px' }} />
        Copy Link
      </MenuItem>
    </>
  );
};

export default ShareMenuButtons;
