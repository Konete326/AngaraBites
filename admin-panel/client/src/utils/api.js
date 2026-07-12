export const getApiUrl = (path) => {
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}${path}`;
  }
  const host = (window.location.hostname === 'localhost' || !window.location.hostname) ? '127.0.0.1' : window.location.hostname;
  return `http://${host}:5000${path}`;
};

