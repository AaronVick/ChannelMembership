import fetch from 'node-fetch';

// Create an in-memory cache to store session data
const cache = new Map();

// Helper function to introduce a delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  console.log('Channels Web Viewer accessed');

  const { fid } = req.query;

  // Validate that fid is provided
  if (!fid) {
    console.error('FID not provided');
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // Fetch channels with caching mechanism
    console.log(`Fetching channels followed by FID: ${fid}`);
    const channels = await fetchChannelsForFidWithCache(fid);

    if (!channels || channels.length === 0) {
      console.error('No channels found for this FID.');
      return res.status(404).json({ error: 'No channels found for the given FID.' });
    }

    // Check if the user is a member of each channel
    console.log(`Checking membership for FID: ${fid}`);
    const membershipInfo = await Promise.all(
      channels.map(async (channel) => {
        const isMember = await checkMembershipStatus(fid, channel.id);
        return { ...channel, isMember };
      })
    );

    // Sort channels by membership status (members first)
    const sortedChannels = membershipInfo.sort((a, b) => (b.isMember ? 1 : 0) - (a.isMember ? 1 : 0));

    // Build the HTML content with a nice layout
    const channelsList = sortedChannels
      .map((channel) => `
        <div class="channel-card">
          <h2>${channel.name}</h2>
          <p>${channel.description || 'No description available'}</p>
          <p><strong>Followers:</strong> ${channel.followerCount}</p>
          <p><strong>Created at:</strong> ${new Date(channel.createdAt * 1000).toLocaleDateString()}</p>
          <p><strong>Membership Status:</strong> ${channel.isMember ? 'Member' : 'Not a Member'}</p>
        </div>
        <hr/>
      `)
      .join('');

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

// Fetch channels followed by the given FID, with caching
async function fetchChannelsForFidWithCache(fid) {
  // Check if data is in the cache and hasn't expired
  if (cache.has(fid)) {
    const cachedData = cache.get(fid);
    const now = Date.now();

    // If cache is less than 5 minutes old, return it
    if (now - cachedData.timestamp < 5 * 60 * 1000) {
      console.log(`Returning cached data for FID: ${fid}`);
      return cachedData.channels;
    }

    // If cache is expired, remove it
    cache.delete(fid);
  }

  // If no cache or expired, fetch data from API
  let channels = [];
  let nextCursor = null;
  let retries = 0;

  try {
    do {
      let url = `https://api.warpcast.com/v1/user-following-channels?fid=${fid}`;
      
      // If there's a cursor, fetch the next page
      if (nextCursor) {
        url += `&cursor=${nextCursor}`;
      }

      console.log(`Making request to Farcaster API: ${url}`);

      const response = await fetch(url);

      // Handle rate-limiting (HTTP 429) by retrying with a delay
      if (response.status === 429 && retries < 3) {
        retries++;
        console.warn(`Rate limited. Retrying after delay... (${retries})`);
        await delay(1000 * retries); // Exponential backoff: 1s, 2s, 3s
        continue;
      }

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

      // Collect the channels from this page
      channels = channels.concat(data.result.channels);

      // Check if there are more pages to fetch
      nextCursor = data.next?.cursor;

    } while (nextCursor); // Continue fetching until no more pages

    // Store fetched data in cache with a timestamp
    cache.set(fid, { channels, timestamp: Date.now() });

    return channels;
  } catch (error) {
    console.error('Error during fetchChannelsForFid:', error);
    throw error;
  }
}

// Check membership status for the given FID and channelId
async function checkMembershipStatus(fid, channelId) {
  try {
    const url = `https://api.warpcast.com/fc/channel-members?channelId=${channelId}&fid=${fid}`;
    console.log(`Checking membership status for channelId: ${channelId}, fid: ${fid}`);

    const response = await fetch(url);

    // Handle rate-limiting (HTTP 429) by retrying with a delay
    if (response.status === 429) {
      console.warn(`Rate limited when checking membership for channelId: ${channelId}. Retrying after delay...`);
      await delay(1000); // Wait for 1 second before retrying
      return checkMembershipStatus(fid, channelId); // Retry
    }

    if (!response.ok) {
      console.error(`Farcaster API returned an error: ${response.status} ${response.statusText}`);
      throw new Error(`Farcaster API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // If the FID is found in the members list, return true for membership
    return data.result.members && data.result.members.some((member) => member.fid === parseInt(fid, 10));
  } catch (error) {
    console.error(`Error checking membership for channelId: ${channelId}`, error);
    return false; // In case of error, default to not a member
  }
}
