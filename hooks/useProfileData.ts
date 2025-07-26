"use client";
import { useState, useEffect, useCallback } from "react";
import { getProfile } from "@/lib/hive/client-functions";
import { ProfileData } from "../components/profile/ProfilePage";
import { VideoPart } from "@/types/VideoPart";

interface HiveAccount {
    posting_json_metadata?: string;
    json_metadata?: string;
}

export default function useProfileData(username: string, hiveAccount: HiveAccount | null) {
    const [profileData, setProfileData] = useState<ProfileData>({
        profileImage: "",
        coverImage: "",
        website: "",
        name: "",
        followers: 0,
        following: 0,
        location: "",
        about: "",
        ethereum_address: "",
        video_parts: [],
        vote_weight: 51, // Default vote weight
    });

    const updateProfileData = useCallback((newData: Partial<ProfileData>) => {
        setProfileData((prev: ProfileData) => ({ ...prev, ...newData }));
    }, []);

    useEffect(() => {
        const fetchProfileInfo = async () => {
            try {
                const profileInfo = await getProfile(username);
                let profileImage = "";
                let coverImage = "";
                let website = "";
                let ethereum_address = "";
                let video_parts: VideoPart[] = [];
                let vote_weight = 51;

                if (hiveAccount?.posting_json_metadata) {
                    try {
                        const parsedMetadata = JSON.parse(hiveAccount.posting_json_metadata);
                        const profile = parsedMetadata?.profile || {};
                        profileImage = profile.profile_image || "";
                        coverImage = profile.cover_image || "";
                        website = profile.website || "";
                    } catch (err) {
                        console.error("Failed to parse profile metadata", err);
                    }
                }

                if (hiveAccount?.json_metadata) {
                    try {
                        const parsedMetadata = JSON.parse(hiveAccount.json_metadata);
                        ethereum_address = parsedMetadata?.extensions?.eth_address || "";
                        video_parts = parsedMetadata?.extensions?.video_parts || [];
                        vote_weight = parsedMetadata?.extensions?.vote_weight || 51;
                    } catch (err) {
                        console.error("Failed to parse json_metadata", err);
                    }
                }

                setProfileData({
                    profileImage,
                    coverImage,
                    website,
                    name: profileInfo?.metadata?.profile?.name || username,
                    followers: profileInfo?.stats?.followers || 0,
                    following: profileInfo?.stats?.following || 0,
                    location: profileInfo?.metadata?.profile?.location || "",
                    about: profileInfo?.metadata?.profile?.about || "",
                    ethereum_address: ethereum_address,
                    video_parts: video_parts,
                    vote_weight: vote_weight,
                });
            } catch (err) {
                console.error("Failed to fetch profile info", err);
            }
        };

        if (username && hiveAccount) {
            fetchProfileInfo();
        }
    }, [username, hiveAccount]);

    return { profileData, updateProfileData };
}
