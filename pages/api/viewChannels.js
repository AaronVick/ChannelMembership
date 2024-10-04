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

    // Log that we are about to fetch channels
    console.log(`Fetching channels for FID: ${fid}`);

    // Fetch the channels with proper error handling
    const channels = await fetchChannelsForFid(fid, authToken);

    if (!channels || channels.length === 0) {
      console.error('No channels found for this FID.');
      return res.status(404).json({ error: 'No channels found for the given FID.' });
    }

    // Log the fetched channels
    console.log('Fetched channels:', channels);

    const channelsList = channels.map(channel => `<li>${channel.fid}</li>`).join('<hr/>');

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
    return res.status(500).json({ error: 'Error fetching channels. Check logs for more details.' });
  }
}

async function fetchChannelsForFid(fid, authToken) {
  try {
    const url = `https://api.warpcast.com/fc/channel-members?fid=${fid}`;

    // Log the API request
    console.log(`Making request to Farcaster API: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Check for response errors
    if (!response.ok) {
      console.error(`Farcaster API returned an error: ${response.status} ${response.statusText}`);
      throw new Error(`Farcaster API error: ${response.status} ${response.statusText}`);
    }

    // Parse and log the response data
    const data = await response.json();
    console.log('Farcaster API response data:', data);

    // Check if the expected structure exists
    if (!data.result || !data.result.members) {
      console.error('Invalid API response structure:', data);
      throw new Error('Farcaster API did not return expected result.members structure.');
    }

    return data.result.members;
  } catch (error) {
    console.error('Error during fetchChannelsForFid:', error);
    throw error;
  }
}

async function generateAuthToken() {
  const { NobleEd25519Signer } = require('@farcaster/hub-nodejs');
  const fid = process.env.WARPCAST_FID;
  let privateKey = process.env.WARPCAST_PRIVATE_KEY;

  // Remove the 0x prefix from the private key if it exists
  if (privateKey.startsWith('0x')) {
    privateKey = privateKey.slice(2);
  }

  console.log('Generating auth token with FID:', fid);

  const signer = new NobleEd25519Signer(privateKey);
  const header = { fid, type: 'app_key', key: privateKey };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payload = { exp: Math.floor(Date.now() / 1000) + 300 }; // Expires in 5 minutes
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureResult = await signer.signMessageHash(Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf-8'));
  const encodedSignature = Buffer.from(signatureResult.value).toString("base64url");

  console.log('Auth token generated successfully.');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}
