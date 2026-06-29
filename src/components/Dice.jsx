import React from 'react';

export default function Dice({ value, isRolling, isTokenMoving, onRoll }) {
  // Rotations corresponding to each dice face
  const faceRotations = {
    1: 'rotateX(0deg) rotateY(0deg)',
    2: 'rotateX(-90deg) rotateY(0deg)',
    3: 'rotateY(90deg) rotateX(0deg)',
    4: 'rotateY(-90deg) rotateX(0deg)',
    5: 'rotateX(90deg) rotateY(0deg)',
    6: 'rotateX(180deg) rotateY(0deg)'
  };

  const currentRotation = faceRotations[value] || 'rotateX(0deg) rotateY(0deg)';

  // Render dots for each face
  const renderDots = (count) => {
    const dotsMap = {
      1: ['center'],
      2: ['top-right', 'bottom-left'],
      3: ['top-right', 'center', 'bottom-left'],
      4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      6: ['top-left', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-right']
    };

    return (dotsMap[count] || []).map((pos, idx) => (
      <span key={idx} className={`dot ${pos}`} />
    ));
  };

  return (
    <div className="dice-component">
      <div className="dice-scene">
        <div 
          className={`dice-cube ${isRolling ? 'rolling' : ''}`}
          style={{ transform: isRolling ? undefined : currentRotation }}
        >
          <div className="dice-face face-1">{renderDots(1)}</div>
          <div className="dice-face face-2">{renderDots(2)}</div>
          <div className="dice-face face-3">{renderDots(3)}</div>
          <div className="dice-face face-4">{renderDots(4)}</div>
          <div className="dice-face face-5">{renderDots(5)}</div>
          <div className="dice-face face-6">{renderDots(6)}</div>
        </div>
      </div>

      <button 
        onClick={onRoll} 
        disabled={isRolling || isTokenMoving} 
        className="roll-dice-btn"
      >
        {isRolling ? 'Mengocok...' : isTokenMoving ? 'Bidak Bergerak...' : 'Lempar Dadu 🎲'}
      </button>

      {value && !isRolling && (
        <div className="roll-result-badge">
          Dadu: <span>{value}</span>
        </div>
      )}
    </div>
  );
}
