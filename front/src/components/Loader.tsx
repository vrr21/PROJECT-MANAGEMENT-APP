import React from 'react';
import '../styles/components/Loader.css';

const Loader: React.FC = () => {
  return (
    <div className="loader-container">
      <div className="loader">
        <div className="dot dot1"></div>
        <div className="dot dot2"></div>
        <div className="dot dot3"></div>
      </div>
    </div>
  );
};

export default Loader;
