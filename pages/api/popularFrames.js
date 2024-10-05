// /pages/popularFrames.js

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
      setLoading(true); // Set loading state when fetching begins
      fetch(`/api/popularFrames?fid=${fid}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else {
            setFrames(data.frames);
          }
          setLoading(false); // Stop loading state once data is fetched
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false); // Stop loading state on error
        });
    }
  }, [fid]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Popular Frames for FID: {fid}</h1>
      <ul>
        {frames.length > 0 ? (
          frames.map((frame, index) => (
            <li key={index}>
              <strong>{frame.frameName}</strong> - {frame.description}
            </li>
          ))
        ) : (
          <li>No frames found</li>
        )}
      </ul>
    </div>
  );
}
