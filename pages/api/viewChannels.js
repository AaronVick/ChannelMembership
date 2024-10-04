import fetch from 'node-fetch';

export default async function handler(req, res) {
  console.log('Channels Web Viewer accessed');

  const { fid, channelId } = req.query;

  // Validate that at least a channelId or fid is provided
  if (!channelId && !fid) {
    console.error('Either Channel ID or FID must be provided');
    return res.status(400).json({ error: 'Channel ID or FID is required' });
  }

  try {
    // If no specific channelId, fallback to fetch all channels
    if (!channelId) {
      console.log('Fetching all channels');
      const channels = await fetchAllChannels();
      return res.status(200).json({ channels });
    }

    // Fetch the details of a specific channel
    console.log(`Fetching channel details for Channel ID: ${channelId}`);
    const channelDetails = await fetchChannelDetails(channelId);

    if (!channelDetails) {
      console.error('No channel found for this channelId.');
      return res.status(404).json({ error: 'No channel found for the given channelId.' });
    }

    // Respond with the channel details
    return res.status(200).json({ channel: channelDetails });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return res.status(500).json({ error: 'Error fetching channels. Check logs for more details.' });
  }
}

// Fetch all channels (GET /v2/all-channels)
async function fetchAllChannels() {
  try {
    const url = `https://api.warpcast.com/v2/all-channels`;
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
    console.error('Error during fetchAllChannels:', error);
    throw error;
  }
}

// Fetch a specific channel's details (GET /v1/channel?channelId=YOUR_CHANNEL_ID)
async function fetchChannelDetails(channelId) {
  try {
    const url = `https://api.warpcast.com/v1/channel?channelId=${channelId}`;
    console.log(`Making request to Farcaster API: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Farcaster API returned an error: ${response.status} ${response.statusText}`);
      throw new Error(`Farcaster API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Farcaster API response data:', data);

    if (!data.result || !data.result.channel) {
      console.error('Invalid API response structure:', data);
      throw new Error('Farcaster API did not return expected result.channel structure.');
    }

    return data.result.channel;
  } catch (error) {
    console.error('Error during fetchChannelDetails:', error);
    throw error;
  }
}
