import React from 'react';

export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '8px', style = {}, className = '' }) => {
  return (
    <div 
      className={`skeleton ${className}`} 
      style={{ width, height, borderRadius, ...style }} 
    />
  );
};

export const SkeletonGrid = ({ count = 8 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', width: '100%' }}>
    {Array(count).fill().map((_, i) => (
      <div key={i} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', boxSizing: 'border-box' }}>
        <Skeleton height="150px" borderRadius="12px" />
        <Skeleton height="24px" width="70%" />
        <Skeleton height="20px" width="40%" />
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
          <Skeleton height="28px" width="30%" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 5 }) => (
  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div style={{ display: 'flex', gap: '1rem' }}>
      {Array(columns).fill().map((_, i) => <Skeleton key={i} height="20px" />)}
    </div>
    {Array(rows).fill().map((_, r) => (
      <div key={`row-${r}`} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        {Array(columns).fill().map((_, c) => <Skeleton key={`col-${c}`} height="60px" />)}
      </div>
    ))}
  </div>
);

export const SkeletonCards = ({ count = 4 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', width: '100%', marginBottom: '2rem' }}>
    {Array(count).fill().map((_, i) => (
      <div key={i} className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Skeleton width="48px" height="48px" borderRadius="12px" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <Skeleton height="16px" width="50%" />
          <Skeleton height="28px" width="80%" />
        </div>
      </div>
    ))}
  </div>
);
