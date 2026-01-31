const { Jimp, loadFont, measureText } = require('jimp');
const { SANS_64_WHITE } = require('jimp/fonts');
const path = require('path');

const text = process.argv[2];
const inputPath = process.argv[3];
const outputPath = process.argv[4];

if (!text || !inputPath || !outputPath) {
    console.error('Usage: node create_wallpaper.js <text> <inputPath> <outputPath>');
    process.exit(1);
}

async function createWallpaper() {
    try {
        const image = await Jimp.read(inputPath);

        // Create a temporary image for each half of the text
        const font = await loadFont(SANS_64_WHITE);

        // Split text slightly to the left of center to shift balance
        // This helps move characters like 'G' to the right half for better spire clearance
        const mid = Math.floor(text.length / 2);
        let splitIdx = mid - 1;

        // Try to find a space near this point, but stay close to ensure balance
        const spaceIdx = text.lastIndexOf(' ', mid + 1);
        if (spaceIdx !== -1 && Math.abs(spaceIdx - mid) <= 2) {
            splitIdx = spaceIdx;
        }

        const leftText = text.substring(0, splitIdx).trim();
        const rightText = text.substring(splitIdx).trim();

        const leftWidth = measureText(font, leftText);
        const rightWidth = measureText(font, rightText);
        const textHeight = 84;

        // Asymmetric gaps for optimal spire clearance
        // User requested 'n' (left) to stay close, but 'g' (right) was too far, moving it closer
        const leftGap = 3;
        const rightGap = 8;

        const imgCenter = image.bitmap.width / 2;
        const textY = image.bitmap.height * 0.13;

        const processHalf = (txt, width) => {
            const hImg = new Jimp({ width: width, height: textHeight, color: 0x00000000 });
            hImg.print({ font, x: 0, y: 0, text: txt });
            hImg.scan(0, 0, hImg.bitmap.width, hImg.bitmap.height, function (x, y, idx) {
                if (this.bitmap.data[idx + 3] > 0) {
                    this.bitmap.data[idx] = 254;
                    this.bitmap.data[idx + 1] = 194;
                    this.bitmap.data[idx + 2] = 21;
                }
            });
            return hImg;
        };

        if (leftText) {
            const leftImg = processHalf(leftText, leftWidth);
            image.composite(leftImg, imgCenter - leftWidth - leftGap, textY);
        }

        if (rightText) {
            const rightImg = processHalf(rightText, rightWidth);
            image.composite(rightImg, imgCenter + rightGap, textY);
        }

        await image.write(outputPath);
        console.log(`Wallpaper created at: ${outputPath}`);

    } catch (error) {
        console.error('Error creating wallpaper:', error);
        process.exit(1);
    }
}

createWallpaper();
