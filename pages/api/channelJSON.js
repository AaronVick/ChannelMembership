// channelJSON.js
import { fetchChannelsForFid } from '../../lib/farcasterAPI';

export default async function handler(req, res) {
    const { fid } = req.query;

    if (!fid) {
        return res.status(400).json({ error: 'FID is required' });
    }

    try {
        console.log(`Fetching all channels for FID: ${fid}`);
        
        const allChannels = await fetchChannelsForFid(fid);

        if (allChannels.length === 0) {
            return res.status(404).json({ error: 'No channels found for this FID' });
        }

        // Return raw JSON data for channels
        return res.status(200).json({ channels: allChannels });
    } catch (error) {
        console.error('Error fetching channels:', error);
        return res.status(500).json({ error: 'Error fetching channels. Check logs for more details.' });
    }
}
