import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { AttachmentBuilder } from "discord.js";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getBackgroundAttachment(): AttachmentBuilder {
    // Try multiple possible paths for the background image
    const possiblePaths = [
        join(__dirname, "../../src/assets/background.jpg"), // From dist/utils to src/assets
        join(__dirname, "../assets/background.jpg"),        // From src/utils to src/assets
        join(process.cwd(), "src/assets/background.jpg"),   // From project root
    ];
    
    let imagePath = "";
    for (const path of possiblePaths) {
        if (existsSync(path)) {
            imagePath = path;
            break;
        }
    }
    
    if (!imagePath) {
        throw new Error("Background image not found in any expected location");
    }
    
    const imageBuffer = readFileSync(imagePath);
    return new AttachmentBuilder(imageBuffer, { name: "background.jpg" });
}

export function getBackgroundAttachmentUrl(): string {
    return "attachment://background.jpg";
}