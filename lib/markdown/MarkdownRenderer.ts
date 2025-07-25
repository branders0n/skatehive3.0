import { DefaultRenderer } from "@hiveio/content-renderer";

// Create a cache for processed markdown
const markdownCache = new Map<string, string>();
const processedContentCache = new Map<string, string>();

export function processMediaContent(content: string): string {
    // Check cache first
    if (processedContentCache.has(content)) {
        return processedContentCache.get(content)!;
    }

    let processedContent = content;
    // Handle 3Speak videos with better validation
    processedContent = processedContent.replace(
        /\[!\[.*?\]\(.*?\)\]\((https?:\/\/3speak\.tv\/watch\?v=([\w\-/]+))\)/g,
        (match, url, videoId) => {
            // Validate videoId is a proper string
            if (!videoId || typeof videoId !== 'string' || videoId.includes('[object') || videoId === '[object Object]') {
                return match; // Return original match if invalid
            }
            return create3SpeakEmbed(videoId);
        }
    );
    // Replace markdown images with IPFS links, but only treat as video if the URL ends with a video extension
    processedContent = processedContent.replace(
        /!\[.*?\]\((https:\/\/(?:gateway\.pinata\.cloud|ipfs\.skatehive\.app)\/ipfs\/([\w-]+)(\.[a-zA-Z0-9]+)?)[^)]*\)/g,
        (_, url, hash, ext) => {
            if (isLikelyVideoID(url)) {
                return createSimpleVideoTag(hash);
            } else {
                // Center the image with a styled div
                return `<div style="display: flex; justify-content: center; align-items: center; margin: 1.5rem 0;"><img src='${url}' alt='IPFS Image' style='max-width: 100%; height: auto; box-shadow: 0 2px 16px rgba(0,0,0,0.12);'/></div>`;
            }
        }
    );
    // Replace iframes with embedded video if an IPFS hash is found
    processedContent = processedContent.replace(
        /<iframe.*?src=["']([^"']+)["'].*?<\/iframe>/g,
        (match, url) => {
            const ipfsHash = url.match(/\/ipfs\/([\w-]+)/)?.[1];
            return ipfsHash ? createSimpleVideoTag(ipfsHash) : match;
        }
    );
    // Instagram post URL to embed - simplified approach
    processedContent = processedContent.replace(
        /^https?:\/\/(www\.)?instagram\.com\/p\/([\w-]+)\/?[^\s]*$/gim,
        (match) => {
            return `[[INSTAGRAM:${match}]]`;
        }
    );
    // Odysee iframe or direct link to embed
    processedContent = processedContent.replace(
        /<iframe[^>]*src=["'](https?:\/\/odysee.com\/[^"]+)["'][^>]*><\/iframe>/gim,
        (_match, url) => `[[ODYSEE:${url}]]`
    );
    // Odysee direct links (optionally, if you want to support them)
    processedContent = processedContent.replace(
        /^https?:\/\/odysee.com\/\$\/embed\/[\w@:%._\+~#=\/-]+/gim,
        (match) => `[[ODYSEE:${match}]]`
    );
    // YouTube iframe embeds
    processedContent = processedContent.replace(
        /<iframe[^>]*src=["'](?:https?:)?\/\/(?:www\.)?(?:youtube\.com|youtu.be)\/embed\/([a-zA-Z0-9_-]{11})[^"']*["'][^>]*><\/iframe>/gim,
        (_match, videoId) => `[[YOUTUBE:${videoId}]]`
    );
    // YouTube direct links
    processedContent = processedContent.replace(
        /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu.be\/)([a-zA-Z0-9_-]{11})[\S]*/gim,
        (_match, videoId) => `[[YOUTUBE:${videoId}]]`
    );
    // Vimeo iframe embeds
    processedContent = processedContent.replace(
        /<iframe[^>]*src=["'](?:https?:)?\/\/(?:player\.)?vimeo.com\/video\/([0-9]+)[^"']*["'][^>]*><\/iframe>/gim,
        (_match, videoId) => `[[VIMEO:${videoId}]]`
    );
    // Vimeo direct links
    processedContent = processedContent.replace(
        /^https?:\/\/(?:www\.)?(?:vimeo.com\/(?:channels\/[\w]+\/)?|player.vimeo.com\/video\/)([0-9]+)[\S]*/gim,
        (_match, videoId) => `[[VIMEO:${videoId}]]`
    );

    // Cache the result
    processedContentCache.set(content, processedContent);
    return processedContent;
}

export default function markdownRenderer(markdown: string): string {
    if (!markdown || markdown.trim() === "") return "";
    
    // Check cache first
    if (markdownCache.has(markdown)) {
        return markdownCache.get(markdown)!;
    }
    
    // Process media content before rendering markdown
    const processedMarkdown = processMediaContent(markdown);
    const renderer = new DefaultRenderer({
        baseUrl: "https://hive.blog/",
        breaks: true,
        skipSanitization: true,
        allowInsecureScriptTags: true,
        addNofollowToLinks: true,
        doNotShowImages: false,
        assetsWidth: 540,
        assetsHeight: 380,
        imageProxyFn: (url: string) => url,
        usertagUrlFn: (account: string) => "/" + "@" + account,
        hashtagUrlFn: (hashtag: string) => "/trending/" + hashtag,
        isLinkSafeFn: () => true,
        addExternalCssClassToMatchingLinksFn: () => true,
        ipfsPrefix: "https://ipfs.skatehive.app",
    });
    const html = renderer.render(processedMarkdown);
    // Replace user mention links with <mention> tags
    const mentionLinkRegex = /<a [^>]*href="\/@([a-z0-9\-.]+)"[^>]*>@([a-z0-9\-.]+)<\/a>/gi;
    const htmlWithMentions = html.replace(mentionLinkRegex, (_match: string, username: string) => {
        return `<mention data-username="${username}">@${username}</mention>`;
    });
    
    // Cache the result
    markdownCache.set(markdown, htmlWithMentions);
    return htmlWithMentions;
}

function isLikelyVideoID(url: string): boolean {
    return /\.(mp4|webm|mov|avi|wmv|flv|mkv)$/i.test(url);
}

function createSimpleVideoTag(videoID: string): string {
    return `<div class="video-embed" data-ipfs-hash="${videoID}">
        <video 
            width="100%" 
            height="auto" 
            controls 
            preload="none" 
            autoplay
            playsinline 
            webkit-playsinline 
            muted
            poster="https://ipfs.skatehive.app/ipfs/${videoID}?format=preview">
            <source src="https://ipfs.skatehive.app/ipfs/${videoID}" type="video/mp4">
            <source src="https://ipfs.skatehive.app/ipfs/${videoID}" type="video/webm">
            Your browser doesn't support HTML5 video.
        </video>
    </div>`;
}

function createImageTag(imageID: string): string {
    return `<div style="text-align: center; display: flex; justify-content: center; margin: 1rem 0;">
        <img src="https://ipfs.skatehive.app/ipfs/${imageID}" alt="IPFS Image" style="max-width: 100%; height: auto;">
    </div>`;
}

function create3SpeakEmbed(videoID: string): string {

    // Ensure videoID is a string and not an object
    const safeVideoID = typeof videoID === 'string' ? videoID : String(videoID);

    // Additional validation to prevent [object Object] in URLs
    if (safeVideoID.includes('[object') || safeVideoID === '[object Object]') {
        return `<div>Invalid video ID: ${safeVideoID}</div>`;
    }

    // Generate the final embed URL
    const embedUrl = `https://3speak.tv/embed?v=${safeVideoID}`;

    return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem 0;">
        <iframe
            src="${embedUrl}"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            frameborder="0"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
        ></iframe>
    </div>`;
}