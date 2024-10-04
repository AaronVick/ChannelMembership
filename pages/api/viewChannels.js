import fetch from 'node-fetch';

// In-memory cache for session data
const cache = new Map();

// Helper function to introduce a delay (in case of rate-limiting)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  console.log('Channels Web Viewer accessed');

  const { fid, cursor, channelName } = req.query;
  const limit = 50; // Limit to avoid API rate-limiting and timeouts
  const start = cursor ? parseInt(cursor, 10) : 0; // Handle pagination with cursor

  if (!fid) {
    console.error('FID not provided');
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    console.log(`Fetching channels followed by FID: ${fid}, start: ${start}`);

    const channels = await fetchChannelsForFidWithCache(fid, limit, start);

    if (!channels || channels.length === 0) {
      return res.status(404).json({ error: 'No channels found for the given FID.' });
    }

    const sortedChannels = channels.sort((a, b) => b.followerCount - a.followerCount);

    // Manual membership check if `channelName` is passed in query
    let membershipCheck = '';
    if (channelName) {
      const channelId = await getChannelIdByName(channelName);
      if (channelId) {
        const isMember = await checkIfMember(channelId, fid);
        membershipCheck = `<p><strong>Membership Status for Channel "${channelName}":</strong> ${isMember ? 'You are a member.' : 'You are not a member.'}</p>`;
      } else {
        membershipCheck = `<p><strong>Error:</strong> Channel "${channelName}" not found.</p>`;
      }
    }

    // Generate channel grid
    const channelsList = sortedChannels
      .map(
        (channel) => `
        <div class="channel-card">
          <h2>${channel.name}</h2>
          <p>${channel.description || 'No description available'}</p>
          <p><strong>Followers:</strong> ${channel.followerCount}</p>
          <p><strong>Created at:</strong> ${new Date(channel.createdAt * 1000).toLocaleDateString()}</p>
          <a href="/api/viewChannels?fid=${fid}&channelName=${channel.name}">Check if you're a member</a>
        </div>
        <hr/>
      `
      )
      .join('');

    const nextCursor = start + limit;

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

        ${membershipCheck}
        
        <div class="channel-list">
          ${channelsList}
        </div>
        ${channels.length >= limit ? `<a href="/api/viewChannels?fid=${fid}&cursor=${nextCursor}">Next Page</a>` : ''}
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

// Fetch channels followed by the given FID with caching and pagination
async function fetchChannelsForFidWithCache(fid, limit, start) {
  if (cache.has(fid)) {
    const cachedData = cache.get(fid);
    const now = Date.now();

    if (now - cachedData.timestamp < 5 * 60 * 1000) {
      console.log(`Returning cached data for FID: ${fid}`);
      return cachedData.channels.slice(start, start + limit);
    }

    cache.delete(fid);
  }

  let channels = [];
  try {
    let url = `https://api.warpcast.com/v1/user-following-channels?fid=${fid}&limit=${limit}&start=${start}`;

    console.log(`Making request to Farcaster API: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Farcaster API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    channels = data.result.channels;

    cache.set(fid, { channels, timestamp: Date.now() });
    return channels.slice(start, start + limit);
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
