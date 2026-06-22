const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const uiComponents = [
    'ProfileImage', 'NotificationBell', 'RandomQuote', 
    'ThemeToggle', 'ThemeProvider', 'ThemeStyleProvider', 
    'ReportButton', 'SaveToFiles', 'DeleteNoteButton', 'ApiKeyDialog', 'EditProfileDialog'
];
const layoutComponents = ['Navbar', 'HeroSection', 'SessionProviderWrapper', 'GoogleScripts'];
const featureComponents = [
    'InteractionsPanel', 'PdfViewer', 'UploadForm', 'FileExplorer', 
    'NotesFeed', 'UserNotesGrid', 'UserStatsCard', 'LeaderboardTable', 
    'TrendingNotes', 'FullPageNoteViewer', 'HomeFolderGrid', 'HomeGroupsGrid'
];

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(srcDir, 'components');
const uiDir = path.join(componentsDir, 'ui');
const layoutDir = path.join(componentsDir, 'layout');
const featureDir = path.join(componentsDir, 'features');

// Create directories
[uiDir, layoutDir, featureDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const fileMappings = []; // { oldPath, newPath, newImportPath, compName }

const processComponent = (compName, targetDir, importPrefix) => {
    const oldPath = path.join(componentsDir, `${compName}.tsx`);
    const newPath = path.join(targetDir, `${compName}.tsx`);
    if (fs.existsSync(oldPath)) {
        fileMappings.push({
            compName,
            oldPath,
            newPath,
            newImportPath: `@/components/${importPrefix}/${compName}`
        });
    }
};

uiComponents.forEach(c => processComponent(c, uiDir, 'ui'));
layoutComponents.forEach(c => processComponent(c, layoutDir, 'layout'));
featureComponents.forEach(c => processComponent(c, featureDir, 'features'));

// Move files
fileMappings.forEach(mapping => {
    fs.renameSync(mapping.oldPath, mapping.newPath);
});

// Helper to recursively find files
function walkSync(dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        if (fs.statSync(dirFile).isDirectory()) {
            filelist = walkSync(dirFile, filelist);
        } else {
            if (dirFile.endsWith('.ts') || dirFile.endsWith('.tsx')) {
                filelist.push(dirFile);
            }
        }
    });
    return filelist;
}

const allFiles = walkSync(srcDir);

// Update imports
allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    fileMappings.forEach(mapping => {
        // Match imports like: @/components/Navbar
        const regex1 = new RegExp(`@/components/${mapping.compName}(?!/)`, 'g');
        if (regex1.test(content)) {
            content = content.replace(regex1, mapping.newImportPath);
            modified = true;
        }

        // Match relative imports like: ./Navbar or ../components/Navbar
        // Only if we are replacing in a way that needs absolute paths
        const regex2 = new RegExp(`['"](\\.\\.?\\/)+(${mapping.compName})['"]`, 'g');
        if (regex2.test(content)) {
            // Convert relative imports to absolute `@/components/category/Comp`
            content = content.replace(regex2, `'${mapping.newImportPath}'`);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
    }
});

console.log('Refactoring completed successfully.');
