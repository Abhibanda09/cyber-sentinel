const fs = require('fs');

const logFile = 'game_logs.json';
const data = fs.readFileSync(logFile, 'utf8');

// Filter out broken lines
const cleanData = data.split('\n').filter(line => {
    try {
        if (line.trim() === "") return false;
        JSON.parse(line);
        return true;
    } catch (e) {
        console.log("Removing broken line: ", line);
        return false;
    }
}).join('\n') + '\n';

fs.writeFileSync(logFile, cleanData);
console.log("✅ Logs cleaned successfully!");