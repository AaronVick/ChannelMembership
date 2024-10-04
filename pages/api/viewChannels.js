// Fetch channels followed by the given FID, including pagination handling
async function fetchChannelsForFid(fid) {
  let channels = [];
  let nextCursor = null;

  try {
    do {
      let url = `https://api.warpcast.com/v1/user-following-channels?fid=${fid}`;
      
      // If there's a cursor, fetch the next page
      if (nextCursor) {
        url += `&cursor=${nextCursor}`;
      }

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

      // Collect the channels from this page
      channels = channels.concat(data.result.channels);

      // Check if there are more pages to fetch
      nextCursor = data.next?.cursor;

    } while (nextCursor); // Continue fetching until no more pages

    return channels;
  } catch (error) {
    console.error('Error during fetchChannelsForFid:', error);
    throw error;
  }
}
