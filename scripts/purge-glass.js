const fs = require('fs');
const path = require('path');

function removeGlassClasses(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            removeGlassClasses(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const originalContent = content;
            
            // Remove backdrop-blur-* classes
            content = content.replace(/\bbackdrop-blur(?:-(?:sm|md|lg|xl|2xl|3xl|none|\[.*?\]))?\b/g, '');
            
            // Remove glass and glass-card
            content = content.replace(/\bglass-card\b/g, '');
            content = content.replace(/\bglass\b/g, '');
            
            // Clean up double spaces created by removal
            content = content.replace(/ +/g, ' ');
            // Clean up leading/trailing spaces inside className quotes
            content = content.replace(/className=" /g, 'className="');
            content = content.replace(/className=' /g, "className='");
            content = content.replace(/ "/g, '"');
            content = content.replace(/ '/g, "'");

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Cleaned: ${fullPath}`);
            }
        }
    }
}

removeGlassClasses(path.join(__dirname, '../src'));
console.log("Global glassmorphism purge complete.");
