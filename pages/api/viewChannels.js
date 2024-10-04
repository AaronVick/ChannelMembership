import fetch from 'node-fetch';

export default async function handler(req, res) {
  console.log('Channels Web Viewer accessed');

  const fid = req.query.fid;

  if (!fid) {
    console.error('FID not provided');
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // Logging FID and API call URL
    console.log(`Fetching channels for FID: ${fid}`);
    const response = await fetch(`https://api.warpcast.com/fc/channel-members?fid=${fid}`);

    // Checking for non-200 response
    if (!response.ok) {
      console.error(`Error from API: ${response.status} ${response.statusText}`);
      return res.status(500).json({ error: `Error from Farcaster API: ${response.status} ${response.statusText}` });
    }

    const data = await response.json();
    console.log('Data fetched from Farcaster API:', data);

    const channels = data.result.members; // Adjust as needed to match API response structure
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
    return res.status(500).json({ error: 'Error fetching channels' });
  }
}
