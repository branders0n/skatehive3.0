"use client";
import React, { useState } from "react";
import {
  Button,
  Box,
  HStack,
  Text,
  useColorMode,
  Icon,
  useToast,
  Avatar as ChakraAvatar,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { AiohaModal, useAioha } from "@aioha/react-ui";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { KeyTypes } from "@aioha/aioha";
import { useFarcasterSession } from "@/hooks/useFarcasterSession";
import { SignInButton, useSignIn } from "@farcaster/auth-kit";
import "@aioha/react-ui/dist/build.css";
import { FaEthereum, FaHive } from "react-icons/fa";
import { SiFarcaster } from "react-icons/si";
import { IoLogOutSharp } from "react-icons/io5";
import { Name, Avatar } from "@coinbase/onchainkit/identity";
// OnchainKit component class names
const ONCHAIN_AVATAR_CLASS = "custom-onchain-avatar";
const ONCHAIN_NAME_CLASS = "custom-onchain-name";
const ONCHAIN_AVATAR_CONTAINER_CLASS = "onchainkit-avatar-container";
const ONCHAIN_NAME_CONTAINER_CLASS = "onchainkit-name-container";

// Custom CSS to override OnchainKit styles

const onchainKitStyles = `
  /* OnchainKit Avatar root container: force size, roundness, and clipping */
  [data-testid="ockAvatar"] {
    width: 20px !important;
    height: 20px !important;
    min-width: 20px !important;
    min-height: 20px !important;
    max-width: 20px !important;
    max-height: 20px !important;
    border-radius: 50% !important;
    overflow: hidden !important;
    box-shadow: none !important;
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  /* Target all children (img, svg, canvas, div) for size and roundness */
  [data-testid="ockAvatar"] img,
  [data-testid="ockAvatar"] svg,
  [data-testid="ockAvatar"] canvas,
  [data-testid="ockAvatar"] div {
    width: 20px !important;
    height: 20px !important;
    min-width: 20px !important;
    min-height: 20px !important;
    max-width: 20px !important;
    max-height: 20px !important;
    border-radius: 50% !important;
    overflow: hidden !important;
    box-shadow: none !important;
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    object-fit: cover !important;
    display: block !important;
  }
  
  /* Balanced name/text styling */
  .${ONCHAIN_NAME_CLASS} {
    font-size: 12px;
    font-weight: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }
  
  /* OnchainKit name component - more gentle styling */
  [data-testid="ockName"] {
    font-size: 12px;
    font-weight: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }
  
  /* Container styles for proper alignment */
  .${ONCHAIN_AVATAR_CONTAINER_CLASS} {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    overflow: hidden;
  }
  
  .${ONCHAIN_NAME_CONTAINER_CLASS} {
    display: flex;
    align-items: center;
    overflow: hidden;
    flex: 1;
  }
`;

interface ConnectionStatus {
  name: string;
  connected: boolean;
  icon: any;
  color: string;
}

export default function AuthButton() {
  const { user, aioha } = useAioha();
  const { colorMode } = useColorMode();
  const router = useRouter();
  const [modalDisplayed, setModalDisplayed] = useState(false);
  const [showConnectionOptions, setShowConnectionOptions] = useState(false);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const toast = useToast();

  // Ensure client-side only rendering to prevent hydration mismatch
  React.useEffect(() => {
    setIsClientMounted(true);
  }, []);

  // Inject custom styles for OnchainKit components
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      // Inject OnchainKit styles
      const onchainKitStyleId = "onchainkit-button-override";
      let existingOnchainKitStyle = document.getElementById(onchainKitStyleId);

      if (!existingOnchainKitStyle) {
        const style = document.createElement("style");
        style.id = onchainKitStyleId;
        style.textContent = onchainKitStyles;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Get connection states
  const { isConnected: isEthereumConnected, address: ethereumAddress } =
    useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const {
    isAuthenticated: isFarcasterConnected,
    profile: farcasterProfile,
    clearSession,
  } = useFarcasterSession();
  const { signIn, signOut } = useSignIn({});

  // Check if any connection exists or if user wants to see connection options
  const hasAnyConnection = user || isEthereumConnected || isFarcasterConnected;
  const shouldShowConnectionPanel =
    isClientMounted && (hasAnyConnection || showConnectionOptions);

  // Connection status data
  const baseConnections: ConnectionStatus[] = [
    {
      name: "Hive",
      connected: !!user,
      icon: FaHive,
      color: "red",
    },
    {
      name: "Ethereum",
      connected: isEthereumConnected,
      icon: FaEthereum,
      color: "blue.200",
    },
    {
      name: "Farcaster",
      connected: isFarcasterConnected,
      icon: SiFarcaster,
      color: "purple.400",
    },
  ];

  // Always use the same order to prevent hydration mismatch
  const connections = baseConnections;

  // Get the primary (first connected) connection for collapsed state
  const primaryConnection =
    connections.find((conn) => conn.connected) || connections[0];

  // Helper functions to get user display information
  const getUserDisplayInfo = (connection: ConnectionStatus) => {
    switch (connection.name) {
      case "Hive":
        if (user) {
          return {
            displayName: user,
            avatar: `https://images.hive.blog/u/${user}/avatar`,
            address: user,
          };
        }
        break;
      case "Ethereum":
        if (ethereumAddress) {
          return {
            displayName: ethereumAddress, // Will be resolved by OnchainKit Name component
            avatar: ethereumAddress, // Will be resolved by OnchainKit Avatar component
            address: ethereumAddress,
          };
        }
        break;
      case "Farcaster":
        if (farcasterProfile) {
          return {
            displayName:
              farcasterProfile.displayName ||
              farcasterProfile.username ||
              `fid:${farcasterProfile.fid}`,
            avatar:
              farcasterProfile.pfpUrl ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=fid${farcasterProfile.fid}`,
            address: farcasterProfile.username || `fid:${farcasterProfile.fid}`,
          };
        }
        break;
    }
    return null;
  };

  const getConnectionButtonText = (connection: ConnectionStatus) => {
    if (connection.connected) {
      return getUserDisplayInfo(connection)?.displayName || "Connected";
    } else {
      switch (connection.name) {
        case "Hive":
          return "Login";
        case "Ethereum":
        case "Farcaster":
          return "Connect";
        default:
          return "Connect";
      }
    }
  };

  const handleShowConnectionOptions = () => {
    setShowConnectionOptions(true);
  };

  const handleProfileClick = () => {
    if (user) {
      router.push(`/user/${user}?view=snaps`);
    }
  };

  const handleHiveLogin = async () => {
    await aioha.logout();
    setModalDisplayed(true);
  };

  const handleHiveLogout = async () => {
    await aioha.logout();
    toast({
      status: "success",
      title: "Logged out from Hive",
      description: "You have been disconnected from Hive",
    });
  };

  const handleEthereumConnect = async () => {
    try {
      const connector = connectors[0]; // Use first available connector
      if (connector) {
        connect({ connector });
      }
    } catch (error) {
      toast({
        status: "error",
        title: "Connection failed",
        description: "Failed to connect to Ethereum wallet",
      });
    }
  };

  const handleEthereumDisconnect = () => {
    disconnect();
    toast({
      status: "success",
      title: "Disconnected from Ethereum",
      description: "Your Ethereum wallet has been disconnected",
    });
  };

  // Alternative approach: Custom Farcaster button with hidden SignInButton
  const hiddenSignInRef = React.useRef<HTMLDivElement>(null);
  const [isFarcasterAuthInProgress, setIsFarcasterAuthInProgress] =
    useState(false);

  const handleCustomFarcasterSignIn = () => {
    // Prevent multiple authentication attempts
    if (isFarcasterAuthInProgress || isFarcasterConnected) {
      console.log("🚫 Farcaster auth already in progress or connected");
      return;
    }

    console.log("🚀 Custom Farcaster Sign In triggered");
    setIsFarcasterAuthInProgress(true);

    // Find and click the hidden SignInButton
    const hiddenButton = hiddenSignInRef.current?.querySelector("button");
    if (hiddenButton) {
      hiddenButton.click();
    }
  };

  const handleFarcasterDisconnect = () => {
    signOut();
    clearSession();
    toast({
      status: "success",
      title: "Disconnected from Farcaster",
      description: "You have been signed out from Farcaster",
    });
  };

  const getConnectionAction = (connection: ConnectionStatus) => {
    if (connection.connected) {
      switch (connection.name) {
        case "Hive":
          return handleHiveLogout;
        case "Ethereum":
          return handleEthereumDisconnect;
        case "Farcaster":
          return handleFarcasterDisconnect;
        default:
          return () => {};
      }
    } else {
      switch (connection.name) {
        case "Hive":
          return handleHiveLogin;
        case "Ethereum":
          return handleEthereumConnect;
        case "Farcaster":
          return handleCustomFarcasterSignIn;
        default:
          return () => {};
      }
    }
  };

  if (!shouldShowConnectionPanel) {
    return (
      <>
        <Button
          onClick={handleShowConnectionOptions}
          color="background"
          w="full"
          mt="auto"
          mb={8}
        >
          Login
        </Button>

        <div className={colorMode}>
          <AiohaModal
            displayed={modalDisplayed}
            loginOptions={{
              msg: "Login",
              keyType: KeyTypes.Posting,
              loginTitle: "Login",
            }}
            onLogin={() => {}}
            onClose={() => setModalDisplayed(false)}
          />
        </div>
      </>
    );
  }

  const renderConnectionButton = (
    connection: ConnectionStatus,
    isPrimary = false
  ) => {
    if (connection.name === "Farcaster" && !connection.connected) {
      return (
        <Button
          key={connection.name}
          size="lg"
          variant="ghost"
          bg="transparent"
          color="text"
          onClick={handleCustomFarcasterSignIn}
          w="full"
          h="full"
          fontSize="sm"
          leftIcon={
            <Icon as={connection.icon} boxSize={4} color={connection.color} />
          }
          isLoading={isFarcasterAuthInProgress}
          loadingText="Connecting..."
          isDisabled={isFarcasterAuthInProgress}
          justifyContent="flex-start"
          pl={3}
          py={3}
          _hover={{
            bg: "success",
            color: "background",
          }}
        >
          <Text fontSize="sm" noOfLines={1} color={connection.color}>
            Connect
          </Text>
        </Button>
      );
    }

    return (
      <Button
        key={connection.name}
        size="lg"
        variant="ghost"
        bg="transparent"
        color="text"
        onClick={getConnectionAction(connection)}
        w="full"
        fontSize="sm"
        _hover={
          connection.connected
            ? {
                bg: "error",
                color: "background",
              }
            : {
                bg: "success",
                color: "background",
              }
        }
        leftIcon={
          connection.connected && getUserDisplayInfo(connection) ? (
            <Box
              position="relative"
              display="inline-block"
              minWidth="24px"
              minHeight="24px"
            >
              {connection.name === "Ethereum" ? (
                <Box
                  width="20px"
                  height="20px"
                  borderRadius="50%"
                  overflow="hidden"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Avatar
                    address={ethereumAddress as `0x${string}`}
                    className={ONCHAIN_AVATAR_CLASS}
                    style={{ width: 20, height: 20 }}
                  />
                </Box>
              ) : (
                <ChakraAvatar
                  size="xs"
                  src={getUserDisplayInfo(connection)?.avatar}
                  name={getUserDisplayInfo(connection)?.displayName}
                  className={ONCHAIN_AVATAR_CLASS}
                  style={{ width: 20, height: 20 }}
                />
              )}
              {/* Only show platform icon in expanded form (not primary) */}
              {!isPrimary && (
                <Box
                  position="absolute"
                  bottom={-2}
                  right={-2}
                  bg="transparent"
                  borderRadius="full"
                  p={0}
                >
                  <Icon
                    as={connection.icon}
                    boxSize={3}
                    color={connection.color}
                  />
                </Box>
              )}
            </Box>
          ) : (
            <Icon as={connection.icon} boxSize={3} />
          )
        }
        justifyContent="flex-start"
        pl={3}
        py={3}
        h="full"
      >
        {connection.name === "Ethereum" && connection.connected ? (
          <Box className={ONCHAIN_NAME_CONTAINER_CLASS}>
            <Name
              address={ethereumAddress as `0x${string}`}
              className={ONCHAIN_NAME_CLASS}
            />
          </Box>
        ) : (
          <Box className={ONCHAIN_NAME_CONTAINER_CLASS}>
            <Text
              fontSize="sm"
              noOfLines={1}
              className={ONCHAIN_NAME_CLASS}
              color={connection.connected ? "text" : connection.color}
            >
              {getConnectionButtonText(connection)}
            </Text>
          </Box>
        )}
      </Button>
    );
  };

  return (
    <>
      <Box
        position="relative"
        mt="auto"
        mb={4}
        onMouseEnter={() => setIsDrawerExpanded(true)}
        onMouseLeave={() => setIsDrawerExpanded(false)}
      >
        {/* Collapsed State - Show only primary connection */}
        <Box
          bg="background"
          borderRadius="md"
          border="1px solid"
          borderColor="border"
          boxShadow="sm"
          onClick={handleProfileClick}
          cursor="pointer"
          _hover={{ borderColor: "primary" }}
          transition="border-color 0.2s ease-in-out"
        >
          <Button
            size="xs"
            variant="ghost"
            bg="transparent"
            color="text"
            w="full"
            fontSize="xs"
            leftIcon={
              primaryConnection.connected &&
              getUserDisplayInfo(primaryConnection) ? (
                <Box
                  position="relative"
                  display="inline-block"
                  minWidth="24px"
                  minHeight="24px"
                >
                  {primaryConnection.name === "Ethereum" ? (
                    <Box
                      width="20px"
                      height="20px"
                      borderRadius="50%"
                      overflow="hidden"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Avatar
                        address={ethereumAddress as `0x${string}`}
                        className={ONCHAIN_AVATAR_CLASS}
                        style={{ width: 20, height: 20 }}
                      />
                    </Box>
                  ) : (
                    <ChakraAvatar
                      size="xs"
                      src={getUserDisplayInfo(primaryConnection)?.avatar}
                      name={getUserDisplayInfo(primaryConnection)?.displayName}
                      className={ONCHAIN_AVATAR_CLASS}
                      style={{ width: 20, height: 20 }}
                    />
                  )}
                </Box>
              ) : (
                <Icon as={primaryConnection.icon} boxSize={3} />
              )
            }
            justifyContent="flex-start"
            pl={3}
            onClick={(e) => {
              e.stopPropagation();
              handleProfileClick();
            }}
          >
            {primaryConnection.name === "Ethereum" &&
            primaryConnection.connected ? (
              <Box className={ONCHAIN_NAME_CONTAINER_CLASS}>
                <Name
                  address={ethereumAddress as `0x${string}`}
                  className={ONCHAIN_NAME_CLASS}
                />
              </Box>
            ) : (
              <Box className={ONCHAIN_NAME_CONTAINER_CLASS}>
                <Text
                  fontSize="xs"
                  noOfLines={1}
                  className={ONCHAIN_NAME_CLASS}
                >
                  {getConnectionButtonText(primaryConnection)}
                </Text>
              </Box>
            )}
          </Button>
        </Box>

        {/* Expanded State - Show all connections */}
        <Box
          position="absolute"
          bottom="100%"
          left={0}
          right={0}
          mb={2}
          bg="background"
          borderRadius="md"
          boxShadow="lg"
          border="1px solid"
          borderColor="border"
          opacity={isDrawerExpanded ? 1 : 0}
          visibility={isDrawerExpanded ? "visible" : "hidden"}
          transform={isDrawerExpanded ? "translateY(0)" : "translateY(10px)"}
          transition="all 0.2s ease-in-out"
          zIndex={1000}
          p={0}
        >
          <Box pt={0} mt={0} h="full" display="flex" flexDirection="column">
            {!hasAnyConnection && (
              <HStack spacing={2} mb={1}>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setShowConnectionOptions(false)}
                  color="muted"
                  _hover={{ color: "text" }}
                  p={1}
                  minH="auto"
                >
                  ✕
                </Button>
              </HStack>
            )}

            {connections.map((connection, index) => (
              <Box
                key={connection.name}
                mt={0}
                pt={0}
                mb={0}
                pb={0}
                flex={1}
                display="flex"
              >
                {renderConnectionButton(connection)}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Hive Login Modal */}
      <div className={colorMode}>
        <AiohaModal
          displayed={modalDisplayed}
          loginOptions={{
            msg: "Login",
            keyType: KeyTypes.Posting,
            loginTitle: "Login",
          }}
          onLogin={() => {}}
          onClose={() => setModalDisplayed(false)}
        />
      </div>

      {/* Hidden Farcaster SignInButton for programmatic triggering */}
      <Box
        ref={hiddenSignInRef}
        position="absolute"
        top="-9999px"
        left="-9999px"
        pointerEvents="none"
        opacity={0}
      >
        <SignInButton
          onSuccess={({ fid, username }) => {
            console.log("🎉 Farcaster Sign In Success:", {
              fid,
              username,
            });
            setIsFarcasterAuthInProgress(false);
            toast({
              status: "success",
              title: "Connected to Farcaster!",
              description: `Welcome, @${username}!`,
              duration: 3000,
            });
          }}
          onError={(error) => {
            console.error("❌ Farcaster Sign In Error:", error);
            setIsFarcasterAuthInProgress(false);
            toast({
              status: "error",
              title: "Authentication failed",
              description:
                error?.message || "Failed to authenticate with Farcaster",
              duration: 5000,
            });
          }}
        />
      </Box>
    </>
  );
}
