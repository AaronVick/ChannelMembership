import fetch from 'node-fetch';

// In-memory cache for session data (not persistent)
const cache = new Map();

export default async function handler(req, res) {
  console.log('Channels Web Viewer accessed');

  const { fid, channelName } = req.query;

  if (!fid) {
    console.error('FID not provided');
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // Check cache first for previously fetched data
    if (cache.has(fid)) {
      console.log('Fetching data from cache for FID:', fid);
      const cachedData = cache.get(fid);
      return renderHTML(cachedData, fid, channelName, res);
    }

    console.log(`Fetching channels followed by FID: ${fid}`);

    // Start the async fetching process but don't wait for it
    fetchAllChannelsForFid(fid)
      .then((channels) => {
        // Cache the data after fetching
        cache.set(fid, channels);
        return renderHTML(channels, fid, channelName, res);
      })
      .catch((error) => {
        console.error('Error fetching channels:', error);
        return res.status(500).json({ error: 'Error fetching channels. Check logs for more details.' });
      });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return res.status(500).json({ error: 'Error fetching channels. Check logs for more details.' });
  }
}

// Fetch all channels for FID with async handling
async function fetchAllChannelsForFid(fid) {
  let allChannels = [];
  let cursor = null;

  try {
    do {
      const url = cursor
        ? `https://api.warpcast.com/v1/user-following-channels?fid=${fid}&cursor=${cursor}`
        : `https://api.warpcast.com/v1/user-following-channels?fid=${fid}`;
      console.log(`Making request to Farcaster API: ${url}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Farcaster API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const channels = data.result.channels || [];
      allChannels = allChannels.concat(channels);

      cursor = data.next ? data.next.cursor : null;
    } while (cursor);

    return allChannels;
  } catch (error) {
    console.error('Error during fetchChannelsForFid:', error);
    throw error;
  }
}

// Render HTML for all channels
function renderHTML(channels, fid, channelName, res) {
  const channelListHTML = channels.map((channel, index) => {
    const alternatingBgColor = index % 2 === 0 ? '#f2f2f2' : '#e6e6ff';
    
    // All channel fields displayed
    return `
      <div style="background-color: ${alternatingBgColor}; padding: 10px; margin-bottom: 5px;">
        <h3>${channel.name} (ID: ${channel.id})</h3>
        <p><strong>Description:</strong> ${channel.description || 'No description available'}</p>
        <p><strong>Follower Count:</strong> ${channel.followerCount}</p>
        <p><strong>Member Count:</strong> ${channel.memberCount || 'N/A'}</p>
        <p><strong>Lead Fid:</strong> ${channel.leadFid}</p>
        <p><strong>Moderators:</strong> ${channel.moderatorFids.join(', ')}</p>
        <img src="${channel.imageUrl || ''}" alt="${channel.name}" width="100" height="100"/>
        <p>
          <a href="#" onclick="checkMembership('${channel.id}', '${fid}')">Check if you're a member</a>
          <span id="membership-status-${channel.id}"></span>
        </p>
      </div>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Channel List for FID ${fid}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
        }
        h3 {
          margin: 0;
        }
        p {
          margin: 0.2em 0;
        }
        div {
          border-bottom: 1px solid #ccc;
        }
      </style>
      <script>
        async function checkMembership(channelId, fid) {
          document.getElementById('membership-status-' + channelId).innerHTML = 'Membership check in progress...';
          const response = await fetch(\`/api/checkMembership?channelId=\${channelId}&fid=\${fid}\`);
          const result = await response.json();
          if (result.isMember) {
            document.getElementById('membership-status-' + channelId).innerHTML = 'You are a member.';
          } else {
            document.getElementById('membership-status-' + channelId).innerHTML = 'You are not a member.';
          }
        }
      </script>
    </head>
    <body>
      <h1>Channels followed by FID: ${fid}</h1>
      <div>${channelListHTML}</div>
    </body>
    </html>
  `;

  return res.status(200).send(htmlContent);
}
