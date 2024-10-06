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
          } else {
            setFrames(data.frames);
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
              <strong>{frame.name || `Frame ${index + 1}`}</strong>
              {frame.url && <p>URL: {frame.url}</p>}
              {frame.score && <p>Score: {frame.score}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p>No frames found</p>
      )}
    </div>
  );
}