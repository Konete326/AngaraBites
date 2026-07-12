import React from "react";

export const Spinner = ({ size = 20, color = "#8f8f8f" }) => {
  const bars = [
    { animationDelay: "-1.2s", transform: "rotate(.0001deg) translate(146%)" },
    { animationDelay: "-1.1s", transform: "rotate(30deg) translate(146%)" },
    { animationDelay: "-1.0s", transform: "rotate(60deg) translate(146%)" },
    { animationDelay: "-0.9s", transform: "rotate(90deg) translate(146%)" },
    { animationDelay: "-0.8s", transform: "rotate(120deg) translate(146%)" },
    { animationDelay: "-0.7s", transform: "rotate(150deg) translate(146%)" },
    { animationDelay: "-0.6s", transform: "rotate(180deg) translate(146%)" },
    { animationDelay: "-0.5s", transform: "rotate(210deg) translate(146%)" },
    { animationDelay: "-0.4s", transform: "rotate(240deg) translate(146%)" },
    { animationDelay: "-0.3s", transform: "rotate(270deg) translate(146%)" },
    { animationDelay: "-0.2s", transform: "rotate(300deg) translate(146%)" },
    { animationDelay: "-0.1s", transform: "rotate(330deg) translate(146%)" }
  ];

  return (
    <div style={{ width: size, height: size, display: 'inline-block' }}>
      <div 
        style={{ 
          width: size, 
          height: size, 
          position: 'relative', 
          top: '50%', 
          left: '50%' 
        }}
      >
        {bars.map((item) => (
          <div
            key={item.transform}
            className="animate-fade-spin"
            style={{ 
              backgroundColor: color, 
              ...item,
              position: 'absolute',
              height: '8%',
              width: '24%',
              left: '-10%',
              top: '-3.9%',
              borderRadius: '5px'
            }}
          />
        ))}
      </div>
    </div>
  );
};
