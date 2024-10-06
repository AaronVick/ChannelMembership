import fetch from 'node-fetch';

async function fetchPopularFrames(fid) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/popularFrames?fid=${fid}`);
  if (!response.ok) {
    throw new Error('Failed to fetch popular frames');
  }
  const data = await response.json();
  return data.frames;
}

export default async function handler(req, res) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-vercel-url.com';

  // Handle GET request (initial frame load)
  if (req.method === 'GET') {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${baseUrl}/frames.png" />
          <meta property="fc:frame:button:1" content="View Popular Frames" />
          <meta property="fc:frame:post_url" content="${baseUrl}/api/frame" />
        </head>
        <body>
          <h1>Welcome to Popular Frames</h1>
          <p>Click the button to start viewing popular frames!</p>
        </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  // Handle POST request (user interactions)
  if (req.method === 'POST') {
    const { untrustedData } = req.body;
    const fid = untrustedData?.fid;
    const buttonIndex = untrustedData?.buttonIndex;
    let frameIndex = parseInt(untrustedData?.state || '-1', 10);

    try {
      const frames = await fetchPopularFrames(fid);

      if (frameIndex === -1 || buttonIndex === 1) {
        frameIndex = 0;
      } else if (buttonIndex === 3 && frameIndex < frames.length - 1) {
        frameIndex++;
      }

      const currentFrame = frames[frameIndex];
      const frameImageUrl = currentFrame.url;

      const shareText = encodeURIComponent(`Check out this Farcaster frame: ${currentFrame.url}`);
      const shareLink = `https://warpcast.com/~/compose?text=${shareText}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${frameImageUrl}" />
            <meta property="fc:frame:button:1" content="${frameIndex > 0 ? 'Previous' : 'Start Over'}" />
            <meta property="fc:frame:button:2" content="Share" />
            <meta property="fc:frame:button:3" content="${frameIndex < frames.length - 1 ? 'Next' : 'Finish'}" />
            <meta property="fc:frame:post_url" content="${baseUrl}/api/frame" />
            <meta property="fc:frame:state" content="${frameIndex}" />
            <meta property="fc:frame:button:2:action" content="link" />
            <meta property="fc:frame:button:2:target" content="${shareLink}" />
          </head>
          <body>
            <h1>Frame ${frameIndex + 1} of ${frames.length}</h1>
            <p>URL: ${currentFrame.url}</p>
            <p>Score: ${currentFrame.score.toFixed(4)}</p>
          </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (error) {
      console.error('Error in frame handler:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Handle other HTTP methods
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}