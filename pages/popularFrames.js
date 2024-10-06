import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PopularFrames() {
  const router = useRouter();
  const { fid } = router.query;
  const [frames, setFrames] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fid) {
      setLoading(true);
      fetch(`/api/popularFrames?fid=${fid}`)
        .then((response) => {
          if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'An error occurred while fetching frames') });
          }
          return response.json();
        })
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else if (Array.isArray(data.frames)) {
            setFrames(data.frames);
          } else {
            setError('Unexpected frame data structure');
          }
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [fid]);

  if (loading) {
    return <div>Loading popular frames...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Popular Frames for FID: {fid}</h1>
      {frames.length > 0 ? (
        <ul>
          {frames.map((frame, index) => (
            <li key={index}>
              <h2>Frame {index + 1}</h2>
              <p><strong>URL:</strong> <a href={frame.url} target="_blank" rel="noopener noreferrer">{frame.url}</a></p>
              <p><strong>Score:</strong> {frame.score.toFixed(4)}</p>
              <p><strong>Interacted by FIDs:</strong> {frame.interacted_by_fids.join(', ')}</p>
              <p><strong>Interacted by FNames:</strong> {frame.interacted_by_fnames.join(', ')}</p>
              <p><strong>Interacted by Usernames:</strong> {frame.interacted_by_usernames.join(', ')}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No frames found</p>
      )}
    </div>
  );
}