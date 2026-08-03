import fs from "fs";
import { pathToFileURL } from "url";

export const getAllFiles = (directory: string): string[] => {
    const fileArray: string[] = [];
    const files = fs.readdirSync(directory);

    for (const file of files) {
        if (fs.statSync(`${directory}/${file}`).isDirectory()) fileArray.push(...getAllFiles(`${directory}/${file}`));
        else {
            // Convert to absolute path
            const absolutePath = `${process.cwd().replace(/\\/g, "/")}/${directory.slice(2)}/${file}`;
            // Convert to file:// URL for ES modules on Windows
            const fileUrl = pathToFileURL(absolutePath).href;
            fileArray.push(fileUrl);
        }
    }

    return fileArray;
};