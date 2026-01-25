const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const inputPath = path.join(process.cwd(), 'public', 'folder-gradient.png');
const outputPath = path.join(process.cwd(), 'public', 'folder-gradient.png');

async function removeBackground() {
    try {
        console.log('Loading image...');
        const image = await loadImage(inputPath);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Sample corner pixel (0,0)
        console.log(`Corner pixel (0,0): R=${data[0]}, G=${data[1]}, B=${data[2]}, A=${data[3]}`);
        console.log(`Image dimensions: ${image.width}x${image.height}`);

        let transparentCount = 0;
        const limit = 50; // Increased threshold

        // Iterate through pixels
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Check if pixel is dark
            if (r < limit && g < limit && b < limit) {
                data[i + 3] = 0; // Set alpha to 0
                transparentCount++;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        console.log(`Processed ${transparentCount} pixels (${(transparentCount / (image.width * image.height) * 100).toFixed(2)}%).`);

        const out = fs.createWriteStream(outputPath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);

        out.on('finish', () => console.log('The PNG file was created.'));
    } catch (error) {
        console.error('Error processing image:', error);
    }
}

removeBackground();
