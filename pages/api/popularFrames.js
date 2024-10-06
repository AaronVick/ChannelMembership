import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { fid } = req.query;

  if (!fid) {
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // Step 1: Get top engaged FIDs
    console.log(`Fetching top engaged FIDs for FID: ${fid}`);
    const engagementResponse = await fetch('https://graph.cast.k3l.io/graph/neighbors/engagement/fids', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([parseInt(fid)]),
    });

    if (!engagementResponse.ok) {
      throw new Error(`Error fetching engaged FIDs: ${engagementResponse.statusText}`);
    }

    const engagedFIDs = await engagementResponse.json();
    console.log('Engaged FIDs:', engagedFIDs);

    if (!engagedFIDs || engagedFIDs.length === 0) {
      return res.status(404).json({ error: 'No engaged FIDs found' });
    }

    // Take top 20 FIDs
    const topFIDs = engagedFIDs.slice(0, 20);
    console.log('Top FIDs for frame retrieval:', topFIDs);

    // Step 2: Fetch frames for the top FIDs
    console.log('Fetching personalized frames for top FIDs');
    const frameResponse = await fetch('https://graph.cast.k3l.io/frames/personalized/rankings/fids', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(topFIDs),
    });

    if (!frameResponse.ok) {
      throw new Error(`Error fetching frames: ${frameResponse.statusText}`);
    }

    const frameData = await frameResponse.json();
    console.log('Frames Data:', frameData);

    // Send the frames data as JSON response
    res.status(200).json({ frames: frameData });

  } catch (error) {
    console.error('Error in popularFrames API:', error);
    res.status(500).json({ error: error.message });
  }
}