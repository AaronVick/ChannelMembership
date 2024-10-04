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

// Look up a channel ID by its name
async function getChannelIdByName(channelName) {
  try {
    const url = `https://api.warpcast.com/v2/all-channels`;
    console.log(`Fetching all channels to look up ID for: ${channelName}`);

    const response = await fetch(url);
    const data = await response.json();

    const channel = data.result.channels.find((ch) => ch.name.toLowerCase() === channelName.toLowerCase());

    return channel ? channel.id : null;
  } catch (error) {
    console.error('Error during channel lookup:', error);
    return null;
  }
}

// Check if the user is a member of the given channel
async function checkIfMember(channelId, fid) {
  try {
    const url = `https://api.warpcast.com/fc/channel-members?channelId=${channelId}&fid=${fid}`;
    console.log(`Making membership request to Farcaster API: ${url}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.result && data.result.members && data.result.members.length > 0) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error during membership check:', error);
    return false;
  }
}

// Render the HTML output
async function renderHTML(channels, fid, channelName, res) {
  const sortedChannels = channels.sort((a, b) => b.followerCount - a.followerCount);

  const channelsList = await Promise.all(
    sortedChannels.map(async (channel, index) => {
      let membershipCheck = '';

      // If a channel name was provided, check membership
      if (channelName && channelName.toLowerCase() === channel.name.toLowerCase()) {
        const channelId = await getChannelIdByName(channelName);
        if (channelId) {
          const isMember = await checkIfMember(channelId, fid);
          membershipCheck = isMember
            ? `<p><strong>Status:</strong> You are a member.</p>`
            : `<p><strong>Status:</strong> You are not a member.</p>`;
        } else {
          membershipCheck = `<p><strong>Error:</strong> Channel "${channelName}" not found.</p>`;
        }
      }

      // Alternate background color between light grey and light purple
      const bgColor = index % 2 === 0 ? '#f9f9f9' : '#f0e6ff';

      return `
        <div class="channel-card" style="background-color: ${bgColor}">
          <h2>${channel.name}</h2>
          <p>${channel.description || 'No description available'}</p>
          <p><strong>Followers:</strong> ${channel.followerCount}</p>
          <p><strong>Created at:</strong> ${new Date(channel.createdAt * 1000).toLocaleDateString()}</p>
          <a href="/api/viewChannels?fid=${fid}&channelName=${channel.name}">Check if you're a member</a>
          ${membershipCheck}
        </div>
      `;
    })
  );

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
          gap: 10px;
          max-width: 800px;
          margin: 0 auto;
        }
        .channel-card {
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        form {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        input[type="text"] {
          padding: 8px;
          margin-right: 10px;
        }
        button {
          padding: 8px;
        }
      </style>
    </head>
    <body>
      <h1>Channels Followed by FID: ${fid}</h1>

      <form method="GET" action="/api/viewChannels">
        <input type="hidden" name="fid" value="${fid}" />
        <input type="text" name="channelName" placeholder="Enter Channel Name to Check Membership" />
        <button type="submit">Check Membership</button>
      </form>

      <div class="channel-list">
        ${channelsList.join('')}
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
