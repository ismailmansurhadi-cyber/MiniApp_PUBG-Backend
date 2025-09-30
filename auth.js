const crypto = require('crypto');

function verify(initData, botToken) {
    if (!initData || !botToken) return false;
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    
    const data = Array.from(params.entries())
        .filter(([k]) => k !== 'hash')
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
    
    const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computed = crypto.createHmac('sha256', secret).update(data).digest('hex');
    
    const authDate = parseInt(params.get('auth_date') || '0');
    const isRecent = Date.now() / 1000 - authDate < 86400;
    
    return hash === computed && isRecent;
}

module.exports = verify;