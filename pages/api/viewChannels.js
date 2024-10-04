import fetch from 'node-fetch';

export default async function handler(req, res) {
  console.log('Channels Web Viewer accessed');

  const { fid } = req.query;

  // Validate that fid is provided
  if (!fid) {
    console.error('FID not provided');
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // Fetch the channels followed by the provided FID
    console.log(`Fetching channels followed by FID: ${fid}`);
    const channels = await fetchChannelsForFid(fid);

    if (!channels || channels.length === 0) {
      console.error('No channels found for this FID.');
      return res.status(404).json({ error: 'No channels found for the given FID.' });
    }

    console.log('Fetched channels:', channels);

    // Build the HTML content with a nice layout
    const channelsList = channels.map(channel => `
      <div class="channel-card">
        <h2>${channel.name}</h2>
        <p>${channel.description || 'No description available'}</p>
        <p><strong>Followers:</strong> ${channel.followerCount}</p>
        <p><strong>Created at:</strong> ${new Date(channel.createdAt * 1000).toLocaleDateString()}</p>
      </div>
      <hr/>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Channels Followed by FID: ${fid}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            padding: 20px;
          }
          h1 {
            text-align: center;
          }
          .channel-list {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .channel-card {
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          hr {
            border: 0;
            border-top: 1px solid #ddd;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <h1>Channels Followed by FID: ${fid}</h1>
        <div class="channel-list">
          ${channelsList}
        </div>
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

// Fetch channels followed by the given FID
async function fetchChannelsForFid(fid) {
  try {
    const url = `https://api.warpcast.com/v1/user-following-channels?fid=${fid}`;
    console.log(`Making request to Farcaster API: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Farcaster API returned an error: ${response.status} ${response.statusText}`);
      throw new Error(`Farcaster API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Farcaster API response data:', data);

    if (!data.result || !data.result.channels) {
      console.error('Invalid API response structure:', data);
      throw new Error('Farcaster API did not return expected result.channels structure.');
    }

    return data.result.channels;
  } catch (error) {
    console.error('Error during fetchChannelsForFid:', error);
    throw error;
  }
}
