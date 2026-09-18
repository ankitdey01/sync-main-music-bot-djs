/**
 * Background image URL for embeds - a permanent Cloudinary link from .env.
 * (The old attachment-based approach re-uploaded the file per track; the
 * self-healing signed-URL refresher was removed once a permanent host was set.)
 */
export function getBackgroundAttachmentUrl(): string {
    return process.env.BACKGROUND_URL || "";
}
