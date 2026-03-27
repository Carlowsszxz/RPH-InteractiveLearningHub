const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Styles/course.css');
let content = fs.readFileSync(filePath, 'utf8');

// Define color replacements
const replacements = {
    '#0066cc': '#98755B',
    '#0052a3': '#5C3422',
    '#e8f0ff': '#F5F3F0',
    '#1a1a1a': '#442913',
    '#ffffff': '#FFFFFF',
    '#f5f5f5': '#F5F3F0',
    '#f0f0f0': '#E2D5C2',
    '#e8e8e8': '#D4BBAC',
    '#f9f9f9': '#F5F3F0',
};

// Apply replacements
for (const [old, newColor] of Object.entries(replacements)) {
    const regex = new RegExp(old, 'gi');
    content = content.replace(regex, newColor);
}

// Also replace rgba colors
content = content.replace(/rgba\(0, 0, 0,/g, 'rgba(68, 41, 19,');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Colors updated successfully in Styles/course.css!');
