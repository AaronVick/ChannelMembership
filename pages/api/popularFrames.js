// /pages/api/popularFrames.js

import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { fid } = req.query;

  if (!fid) {
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // Step 1: Get top engaged FIDs
    const engagementResponse = await fetch(`https://graph.cast.k3l.io/graph/neighbors/engagement/fids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([parseInt(fid)]),  // Pass input FID
    });

    if (!engagementResponse.ok) {
      throw new Error(`Error fetching engaged FIDs: ${engagementResponse.statusText}`);
    }

    const engagedFIDs = await engagementResponse.json();
    const topFIDs = engagedFIDs.slice(0, 20); // Get top 20 FIDs

    // Step 2: Get personalized frames for the top FIDs
    const frameResponse = await fetch(`https://graph.cast.k3l.io/frames/personalized/rankings/fids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(topFIDs),  // Pass top FIDs to get frames
    });

    if (!frameResponse.ok) {
      throw new Error(`Error fetching frames: ${frameResponse.statusText}`);
    }

    const frameData = await frameResponse.json();

    // Return the frames as JSON response
    res.status(200).json({ frames: frameData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
