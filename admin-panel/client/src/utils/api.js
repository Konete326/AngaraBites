export const getApiUrl = (path) => {
  const host = (window.location.hostname === 'localhost' || !window.location.hostname) ? '127.0.0.1' : window.location.hostname;
  return `http://${host}:5000${path}`;
};
