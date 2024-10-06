// /pages/api/popularFrames.js

import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { fid } = req.query;

  // Check if FID is provided in the query string
  if (!fid) {
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // Step 1: Get top engaged FIDs
    const engagementResponse = await fetch('https://graph.cast.k3l.io/graph/neighbors/engagement/fids', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([parseInt(fid)]),  // Convert FID to number and pass as array
    });

    // Check if the engagement request was successful
    if (!engagementResponse.ok) {
      throw new Error(`Error fetching engaged FIDs: ${engagementResponse.statusText}`);
    }

    // Parse the response to get the list of engaged FIDs
    const engagedFIDs = await engagementResponse.json();

    // Log the engaged FIDs to the console for debugging
    console.log('Engaged FIDs:', engagedFIDs);

    // Handle case where no FIDs are returned
    if (!engagedFIDs || engagedFIDs.length === 0) {
      throw new Error('No engaged FIDs found');
    }

    // Take top 20 FIDs
    const topFIDs = engagedFIDs.slice(0, 20);

    // Debug: Check if FIDs are valid before making the second API call
    console.log('Top FIDs for frame retrieval:', topFIDs);

    // Step 2: Fetch frames only if FIDs are valid
    if (topFIDs && topFIDs.length > 0) {
      // Step 2: Get personalized frames for the top FIDs
      const frameResponse = await fetch('https://graph.cast.k3l.io/frames/personalized/rankings/fids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(topFIDs),  // Pass top FIDs to get frames
      });

      // Log the full response to catch unexpected errors
      const frameResponseBody = await frameResponse.text();
      console.log('Frames API Response:', frameResponseBody);

      // Check if the frames request was successful
      if (!frameResponse.ok) {
        throw new Error(`Error fetching frames: ${frameResponse.statusText}`);
      }

      // Parse the response to get the list of frames
      const frameData = JSON.parse(frameResponseBody);

      // Log the frames data to the console for debugging
      console.log('Frames Data:', frameData);

      // Send the frames data as JSON response
      res.status(200).json({ frames: frameData });
    } else {
      res.status(404).json({ error: 'No valid FIDs found for frame retrieval' });
    }

  } catch (error) {
    // Log the error to the console for debugging
    console.error('Error:', error.message);

    // Send the error message as a JSON response with status 500
    res.status(500).json({ error: error.message });
  }
}
