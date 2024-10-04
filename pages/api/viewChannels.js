import fetch from 'node-fetch';
import { NobleEd25519Signer } from '@farcaster/hub-nodejs';

export default async function handler(req, res) {
  console.log('Channels Web Viewer accessed');

  const fid = req.query.fid;

  if (!fid) {
    console.error('FID not provided');
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // Generate the auth token
    const authToken = await generateAuthToken();

    const channels = await fetchChannelsForFid(fid, authToken);
    const channelsList = channels.map(channel => `<li>${channel.name}</li>`).join('<hr/>');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Channels for FID: ${fid}</title>
      </head>
      <body>
        <h1>Channels for FID: ${fid}</h1>
        <ul>
          ${channelsList}
        </ul>
        <button onclick="window.location.href='/viewChannels?fid=${fid}&page=prev'">Previous</button>
        <button onclick="window.location.href='/viewChannels?fid=${fid}&page=next'">Next</button>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return res.status(500).json({ error: 'Error fetching channels' });
  }
}

async function fetchChannelsForFid(fid, authToken) {
  const response = await fetch(`https://api.warpcast.com/fc/channel-members?fid=${fid}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  const data = await response.json();
  return data.result.members;
}

// Reuse the generateAuthToken function from channels.js
async function generateAuthToken() {
  const { NobleEd25519Signer } = require('@farcaster/hub-nodejs');
  const fid = process.env.WARPCAST_FID;
  const privateKey = process.env.WARPCAST_PRIVATE_KEY;

  const signer = new NobleEd25519Signer(privateKey);
  const header = { fid, type: 'app_key', key: privateKey };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payload = { exp: Math.floor(Date.now() / 1000) + 300 }; // Expires in 5 minutes
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureResult = await signer.signMessageHash(Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf-8'));
  const encodedSignature = Buffer.from(signatureResult.value).toString("base64url");

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}
