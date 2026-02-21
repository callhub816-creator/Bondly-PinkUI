
export const getPlaceholderImage = (name: string, type: 'card' | 'square' | 'hi') => {
  const width = type === 'square' ? 800 : 800;
  const height = type === 'square' ? 800 : 1200;
  
  const colors = ['#FF9ACB', '#B28DFF', '#9F7AEA', '#FFB6C1', '#FF5D8F', '#60A5FA'];
  const colorIndex = name.length % colors.length;
  const bg = colors[colorIndex];
  const text = encodeURIComponent(name);
  const label = type.toUpperCase();

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <text x="50%" y="45%" font-family="serif" font-size="60" fill="#4A2040" text-anchor="middle" dominant-baseline="middle">${text}</text>
      <text x="50%" y="55%" font-family="sans-serif" font-size="30" fill="#4A2040" text-anchor="middle" dominant-baseline="middle" opacity="0.6">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim().replace(/\s+/g, ' '))}`;
};
