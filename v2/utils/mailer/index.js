const { readFileSync } = require('fs');
const { join } = require('path');

const generateContent = (fileName, replacements) => {
    const filePath = join(__dirname, fileName);
    let content = readFileSync(filePath, 'utf8');
    
    Object.keys(replacements).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, replacements[key]);
    });
    return content;
}

module.exports = { generateContent };