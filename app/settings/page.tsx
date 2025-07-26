"use client";
import React, { useMemo } from "react";
import {
  Box,
  Select,
  Text,
  useToast,
  VStack,
  Heading,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import { useTheme, ThemeName, themeMap } from "../themeProvider";
import LottieAnimation from "@/components/shared/LottieAnimation";
import UpvoteSnapContainer from "@/components/homepage/UpvoteSnapContainer";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import LogoMatrix from "../../components/graphics/LogoMatrix";
import FarcasterUniversalLink from "@/components/farcaster/FarcasterUniversalLink";
import VoteWeightSlider from "@/components/settings/VoteWeightSlider";
import { useAioha } from "@aioha/react-ui";
import useHiveAccount from "@/hooks/useHiveAccount";
import useProfileData from "@/hooks/useProfileData";

const Settings = () => {
  const { themeName, setThemeName } = useTheme();
  const { user } = useAioha();
  const toast = useToast();

  // Memoize user data to prevent re-renders
  const userData = useMemo(
    () => ({
      hiveUsername:
        typeof user === "string" ? user : user?.name || user?.username,
      postingKey: typeof user === "object" ? user?.keys?.posting : undefined,
    }),
    [user]
  );

  // Get user's Hive account and profile data
  const { hiveAccount } = useHiveAccount(userData.hiveUsername || "");
  const { profileData } = useProfileData(userData.hiveUsername || "", hiveAccount);

  // Rive animation setup
  const STATE_MACHINE_NAME = "ButtonStateMachine"; // Update if your state machine is named differently
  const TRIGGER_NAME = "click"; // Update if your trigger is named differently
  const { rive, RiveComponent } = useRive({
    src: "/buttons/blog.riv",
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
  });
  const clickInput = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    TRIGGER_NAME
  );

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = event.target.value as ThemeName;
    setThemeName(newTheme);
    toast({
      title: "Theme Updated!",
      description: `Successfully switched to ${newTheme} theme`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // Format theme name for display
  const formatThemeName = (name: string) => {
    return name
      .split(/(?=[A-Z])|[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const buttonSources = [
    "/buttons/home.riv",
    "/buttons/blog.riv",
    "/buttons/leaderboard.riv",
    "/buttons/map.riv",
    "/buttons/bounties.riv",
    "/buttons/notif.riv",
    "/buttons/wallet.riv",
    "/buttons/profile.riv",
  ];

  return (
    <Box minH="100vh" bg="background" color="primary">
      <Box maxW="container.md" mx="auto" px={6} py={12}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Heading size="xl" color="primary" mb={2}>
              ⚙️ Settings
            </Heading>
            <Text color="primary" fontSize="lg">
              Customize your SkateHive experience
            </Text>
          </Box>

          {/* Theme Selection Card */}
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
                  🎨 Theme Selection
                </Heading>
                <Text color="primary" fontSize="sm">
                  Choose your preferred visual style
                </Text>
              </Box>
              <Select
                value={themeName}
                onChange={handleThemeChange}
                size="lg"
                bg="background"
                color="primary"
                borderColor="muted"
                borderWidth="2px"
                fontWeight="semibold"
                _focus={{
                  borderColor: "accent",
                  boxShadow: "0 0 0 3px rgba(var(--chakra-colors-accent), 0.1)",
                  outline: "none",
                }}
                _hover={{ borderColor: "accent" }}
                sx={{
                  option: {
                    background: "var(--chakra-colors-background)",
                    color: "var(--chakra-colors-primary)",
                  },
                }}
              >
                {Object.keys(themeMap).map((theme) => (
                  <option key={theme} value={theme}>
                    {formatThemeName(theme)}
                  </option>
                ))}
              </Select>
            </VStack>
          </Box>

          {/* Farcaster Account Link */}
          {userData.hiveUsername && (
            <>
              <FarcasterUniversalLink
                hiveUsername={userData.hiveUsername}
                postingKey={userData.postingKey}
              />
              
              {/* Vote Weight Slider */}
              <VoteWeightSlider
                username={userData.hiveUsername}
                currentVoteWeight={profileData.vote_weight || 51}
                onVoteWeightUpdate={(voteWeight) => {
                  console.log("Vote weight updated:", voteWeight);
                }}
              />
              
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
                      🏆 Community
                    </Heading>
                    <Text color="primary" fontSize="sm">
                      Help support the SkateHive community
                    </Text>
                  </Box>
                  <UpvoteSnapContainer />
                </VStack>
              </Box>

              {/* Security Section */}
              <Box
                bg="background"
                border="1px solid"
                borderColor="muted"
                shadow="sm"
              >
                <Accordion allowToggle>
                  <AccordionItem border="none">
                    <AccordionButton p={6} _hover={{ bg: "transparent" }}>
                      <VStack align="start" flex="1" spacing={1}>
                        <Heading size="md" color="primary">
                          🔐 Security Settings (BETA)
                        </Heading>
                        <Text color="primary" fontSize="sm">
                          Manage your private keys and account security
                        </Text>
                      </VStack>
                      <AccordionIcon color="accent" />
                    </AccordionButton>
                    <AccordionPanel px={6} pb={6}>
                      <Box
                        p={6}
                        bg="background"
                        border="1px solid"
                        borderColor="orange.500"
                        position="relative"
                        _before={{
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "3px",
                          bg: "orange.500",
                        }}
                      >
                        <VStack spacing={4} align="stretch">
                          <Box>
                            <Text
                              color="orange.400"
                              fontWeight="bold"
                              fontSize="sm"
                              mb={2}
                            >
                              ⚠️ SECURITY NOTICE
                            </Text>
                            <Text color="primary" mb={3} lineHeight="tall">
                              When your account was created, the SkateHive team
                              temporarily stored your private keys.
                              <Text
                                as="span"
                                fontWeight="bold"
                                color="orange.400"
                              >
                                {" "}
                                This is not secure.
                              </Text>
                            </Text>
                            <Text color="primary" mb={4} lineHeight="tall">
                              We strongly recommend generating new private keys
                              and updating your Hive account. Store your new
                              keys safely - never share them with anyone.
                            </Text>
                          </Box>
                          <Box
                            textAlign="center"
                            py={8}
                            bg="background"
                            border="2px dashed"
                            borderColor="primary"
                          >
                            <Text
                              fontWeight="bold"
                              fontSize="lg"
                              color="primary"
                              opacity={0.7}
                            >
                              🚧 Coming Soon...
                            </Text>
                            <Text
                              color="primary"
                              fontSize="sm"
                              mt={2}
                              opacity={0.6}
                            >
                              Private key generation feature in development
                            </Text>
                          </Box>
                        </VStack>
                      </Box>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </Box>
            </>
          )}
          {/* Fun Section */}
          <Box
            bg="background"
            border="1px solid"
            borderColor="muted"
            p={6}
            shadow="sm"
          >
            <VStack spacing={4}>
              <Box textAlign="center">
                <Heading size="md" color="primary" mb={1}>
                  🎭 Experience
                </Heading>
                <Text color="primary" fontSize="sm">
                  Interactive elements and animations
                </Text>
              </Box>
              <Box py={4}>
                <LottieAnimation src="https://lottie.host/911167fe-726b-4e03-a295-56839461ebc4/WOauo8GTeO.lottie" />
              </Box>
            </VStack>
          </Box>

          {/* Footer Graphics */}
          <Box py={8}>
            <LogoMatrix />
          </Box>
        </VStack>
      </Box>
    </Box>
  );
};

export default Settings;
