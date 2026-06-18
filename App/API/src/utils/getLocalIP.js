const os = require('os');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const [name, nets] of Object.entries(interfaces)) {
        const isVirtual = /vethernet|wsl|hyper-v|vmware|virtualbox|loopback/i.test(name);
        for (const net of nets) {
            if (net.family !== 'IPv4' || net.internal || isVirtual) continue;
            candidates.push({ address: net.address, name });
        }
    }

    // Preferir IPs de red LAN típica (WiFi/Ethernet real)
    const preferred = candidates.find(c => /^192\.168\./.test(c.address))
        ?? candidates.find(c => /^10\./.test(c.address))
        ?? candidates[0];

    return preferred?.address ?? 'localhost';
}

module.exports = getLocalIP;
