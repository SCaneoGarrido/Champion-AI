const os = require('os');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const [name, nets] of Object.entries(interfaces)) {
        // Ignoramos interfaces virtuales habituales, pero NO la de Tailscale
        const isVirtual = /vethernet|wsl|hyper-v|vmware|virtualbox|loopback/i.test(name);

        for (const net of nets) {
            if (net.family !== 'IPv4' || net.internal || isVirtual) continue;
            
            // Detectar si la interfaz o la IP pertenecen a Tailscale
            const isTailscale = /tailscale/i.test(name) || /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(net.address);

            candidates.push({ address: net.address, name, isTailscale });
        }
    }

    // 1. Prioridad: Interfaz/IP de Tailscale
    const tailscaleNode = candidates.find(c => c.isTailscale);
    if (tailscaleNode) {
        return tailscaleNode.address;
    }

    // 2. Segunda opción: Red LAN típica (WiFi / Ethernet)
    const preferred = candidates.find(c => /^192\.168\./.test(c.address))
        ?? candidates.find(c => /^10\./.test(c.address))
        ?? candidates[0];

    return preferred?.address ?? 'localhost';
}

module.exports = getLocalIP;