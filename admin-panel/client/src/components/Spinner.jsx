import React from 'react';
import { Loader2 } from 'lucide-react';

const Spinner = ({ size = 40, fullScreen = true }) => {
  if (fullScreen) {
    return (
      <div style={styles.fullScreenContainer}>
        <Loader2 size={size} style={styles.spinnerIcon} />
      </div>
    );
  }

  return (
    <div style={styles.inlineContainer}>
      <Loader2 size={size} style={styles.spinnerIcon} />
    </div>
  );
};

const styles = {
  fullScreenContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    minHeight: '400px',
  },
  inlineContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerIcon: {
    color: 'var(--primary-yellow)',
    animation: 'spin 1s linear infinite',
  }
};

export default Spinner;
