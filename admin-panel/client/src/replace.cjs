const fs = require('fs');
const path = require('path');

const dir = 'd:/mern projects/Angara/admin-panel/client/src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace all variations of localhost:5000 strings
    content = content.replace(/'http:\/\/localhost:5000/g, '`http://${window.location.hostname}:5000');
    content = content.replace(/`http:\/\/localhost:5000/g, '`http://${window.location.hostname}:5000');
    content = content.replace(/"http:\/\/localhost:5000/g, '`http://${window.location.hostname}:5000');
    
    fs.writeFileSync(filePath, content);
});

console.log('All files updated to use dynamic hostname!');
