import fetch from 'node-fetch';

// In-memory cache for session data
const cache = new Map();

// Helper function to introduce a delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  console.log('Channels Web Viewer accessed');

  const { fid, cursor } = req.query;
  const limit = 50; // Limit to avoid API rate-limiting and timeouts
  const start = cursor ? parseInt(cursor, 10) : 0; // Handle pagination with cursor

  // Validate that fid is provided
  if (!fid) {
    console.error('FID not provided');
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // Fetch channels followed by the given FID and limit the number of API requests
    console.log(`Fetching channels followed by FID: ${fid}, start: ${start}`);
    const channels = await fetchChannelsForFidWithCache(fid, limit, start);

    if (!channels || channels.length === 0) {
      console.error('No channels found for this FID.');
      return res.status(404).json({ error: 'No channels found for the given FID.' });
    }

    // Check if membership data is already present in the API response and sort based on membership
    const sortedChannels = channels.sort((a, b) => (b.isMember ? 1 : 0) - (a.isMember ? 1 : 0));

    // Generate HTML response
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
        </style>
      </head>
      <body>
        <h1>Channels Followed by FID: ${fid}</h1>
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
  // Check if data is in the cache and hasn't expired
  if (cache.has(fid)) {
    const cachedData = cache.get(fid);
    const now = Date.now();

    // If cache is less than 5 minutes old, return it
    if (now - cachedData.timestamp < 5 * 60 * 1000) {
      console.log(`Returning cached data for FID: ${fid}`);
      return cachedData.channels.slice(start, start + limit);
    }

    // If cache is expired, remove it
    cache.delete(fid);
  }

  // If no cache or expired, fetch data from API
  let channels = [];
  let nextCursor = null;
  let retries = 0;

  try {
    let url = `https://api.warpcast.com/v1/user-following-channels?fid=${fid}&limit=${limit}&start=${start}`;

    console.log(`Making request to Farcaster API: ${url}`);

    const response = await fetch(url);

    // Handle rate-limiting (HTTP 429) by retrying with a delay
    if (response.status === 429 && retries < 3) {
      retries++;
      console.warn(`Rate limited. Retrying after delay... (${retries})`);
      await delay(1000 * retries); // Exponential backoff: 1s, 2s, 3s
      return fetchChannelsForFidWithCache(fid, limit, start); // Retry
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

    // Collect the channels from the response
    channels = data.result.channels;

    // Store fetched data in cache with a timestamp
    cache.set(fid, { channels, timestamp: Date.now() });

    return channels.slice(start, start + limit);
  } catch (error) {
    console.error('Error during fetchChannelsForFid:', error);
    throw error;
  }
}
