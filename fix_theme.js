const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace text-white with text-foreground, except in SciFiLogo (which should probably stay white for space theme)
    if (!file.includes('SciFiLogo')) {
        content = content.replace(/\btext-white\b/g, 'text-foreground');
        content = content.replace(/\bfrom-white\b/g, 'from-foreground');
        content = content.replace(/\bto-white\/(50|60|80)\b/g, 'to-foreground/$1');
        content = content.replace(/\bbg-white\//g, 'bg-foreground/');
        content = content.replace(/\bborder-white\//g, 'border-foreground/');
        content = content.replace(/\btext-white\//g, 'text-foreground/');
    }

    fs.writeFileSync(file, content, 'utf8');
});

console.log('Fixed themes globally!');
