import Head from 'next/head';

export default function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://channel-membership.vercel.app';
  const shareText = encodeURIComponent('Check out the channels you have membership to\n\nFrame by @aaronv.eth');
  const shareLink = `https://warpcast.com/~/compose?text=${shareText}&embeds[]=${encodeURIComponent(baseUrl)}`;

  return (
    <div>
      <Head>
        <title>Farcaster Channels Viewer</title>
        <meta name="description" content="View channels for a specific FID on Farcaster" />
        <meta property="og:title" content="Farcaster Channels Viewer" />
        <meta property="og:description" content="Explore Farcaster channels based on FID" />
        <meta property="og:image" content={`${baseUrl}/channels.png`} />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={`${baseUrl}/channels.png`} />
        <meta property="fc:frame:button:1" content="Channel Member" />
        <meta property="fc:frame:button:1:post_url" content={`${baseUrl}/api/channels`} />
        <meta property="fc:frame:button:2" content="Share" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content={shareLink} />
      </Head>
      <h1>Farcaster Channels Viewer</h1>
      <img
        src="/channels.png"
        alt="Channels"
        width="600"
        height="300"
      />
    </div>
  );
}
