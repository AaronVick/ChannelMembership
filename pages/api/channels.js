import fetch from 'node-fetch'; // If you need to fetch external APIs

export default async function handler(req, res) {
  console.log('Channels API accessed');

  const fid = req.query.fid || req.body.untrustedData?.fid;

  if (!fid) {
    console.error('FID not provided');
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    const channels = await fetchChannelsForFid(fid);
    const channelsList = channels.map(channel => `<li>${channel.name}</li>`).join('<hr/>');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-vercel-url.com';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${baseUrl}/channels.png" />
        <meta property="fc:frame:button:1" content="Previous" />
        <meta property="fc:frame:button:1:post_url" content="${baseUrl}/api/channels?fid=${fid}&page=prev" />
        <meta property="fc:frame:button:2" content="Next" />
        <meta property="fc:frame:button:2:post_url" content="${baseUrl}/api/channels?fid=${fid}&page=next" />
      </head>
      <body>
        <h1>Channels for FID: ${fid}</h1>
        <ul>
          ${channelsList}
        </ul>
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

async function fetchChannelsForFid(fid) {
  const response = await fetch(`https://api.warpcast.com/fc/channel-members?fid=${fid}`);
  const data = await response.json();
  return data.result.members; // Adjust as needed to match the API structure
}
