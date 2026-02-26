const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

const CLIENT_ID = '1007179758652-466dr7gkh3t2nvea4mb9u5ckr62r8ohn.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:8844';

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const code = parsed.query.code;

  if (!code) {
    res.writeHead(400);
    res.end('No code received');
    return;
  }

  console.log('Authorization code received! Exchanging for tokens...');

  const postData = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  }).toString();

  const tokenReq = https.request({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (tokenRes) => {
    let data = '';
    tokenRes.on('data', chunk => data += chunk);
    tokenRes.on('end', () => {
      const tokens = JSON.parse(data);
      if (tokens.refresh_token) {
        const envContent = `CHROME_CLIENT_ID=${CLIENT_ID}\nCHROME_CLIENT_SECRET=${CLIENT_SECRET}\nCHROME_REFRESH_TOKEN=${tokens.refresh_token}\n`;
        fs.writeFileSync(__dirname + '/.env.chrome', envContent);
        console.log('\n=== SUCCESS ===');
        console.log('Refresh token saved to .env.chrome');
        console.log('Refresh token:', tokens.refresh_token);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Success! PeakTools OAuth connected.</h1><p>You can close this tab.</p>');
      } else {
        console.log('ERROR:', data);
        res.writeHead(500);
        res.end('Token exchange failed: ' + data);
      }
      server.close();
    });
  });

  tokenReq.write(postData);
  tokenReq.end();
});

server.listen(8844, () => {
  console.log('Waiting for OAuth callback on http://localhost:8844 ...');
  console.log('Open this URL in your browser:');
  console.log(`\n${REDIRECT_URI.replace('localhost:8844', 'accounts.google.com/o/oauth2/auth')}?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&access_type=offline&prompt=consent\n`);
});
