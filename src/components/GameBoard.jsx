import React, { useState, useEffect, useRef } from 'react';
import { boardConfig, getCellCoords, getRegionForCell } from '../data/boardConfig';
import { foodData } from '../data/foodData';

export default function GameBoard({ players, theme = 'terang', onCellClick }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [animatingCoords, setAnimatingCoords] = useState({}); // { [playerId]: { x, y } }
  
  const prevPlayersRef = useRef([]);

  // Update dimensions on resize
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 350);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  // Visual path animation logic for climbing/sliding along ladders and snakes
  useEffect(() => {
    players.forEach(player => {
      const prevPlayer = prevPlayersRef.current.find(p => p.id === player.id);
      const wasClimbing = prevPlayer ? prevPlayer.isClimbing : false;
      const wasSliding = prevPlayer ? prevPlayer.isSliding : false;

      if ((player.isClimbing && !wasClimbing) || (player.isSliding && !wasSliding)) {
        animatePath(player.id, player.position, player.isClimbing);
      }
    });
    prevPlayersRef.current = players;
  }, [players]);

  const animatePath = (playerId, targetPos, isClimbing) => {
    let startCell = 0;
    const endCell = targetPos;
    const isSnake = !isClimbing;

    if (isClimbing) {
      const ladder = boardConfig.ladders.find(l => l.end === targetPos);
      if (!ladder) return;
      startCell = ladder.start;
    } else {
      const snake = boardConfig.snakes.find(s => s.end === targetPos);
      if (!snake) return;
      startCell = snake.start;
    }

    const p1 = getAbsoluteCoords(startCell, true);
    const p2 = getAbsoluteCoords(endCell, true);

    const duration = 1100; // Animation timing matches state delays (approx 1.1s)
    const startTime = performance.now();

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;

    const run = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      let currentX = p1.x + progress * dx;
      let currentY = p1.y + progress * dy;

      if (isSnake) {
        // Sync path tracing with actual wavy snake SVG drawing formula
        let wave = Math.sin(progress * Math.PI * 4) * (len * 0.08) * (1 - progress * 0.4);
        if (theme === 'retro') {
          wave = Math.round(Math.sin(progress * Math.PI * 4) * 2.5) / 2.5 * (len * 0.08) * (1 - progress * 0.4);
        }
        currentX += px * wave;
        currentY += py * wave;
      }

      setAnimatingCoords(prev => ({
        ...prev,
        [playerId]: { x: currentX, y: currentY }
      }));

      if (progress < 1) {
        requestAnimationFrame(run);
      } else {
        setAnimatingCoords(prev => {
          const updated = { ...prev };
          delete updated[playerId];
          return updated;
        });
      }
    };

    requestAnimationFrame(run);
  };

  const { width, height } = dimensions;

  // Let start zone width be 10% of total width (capped between 65px and 95px)
  const startZoneWidth = Math.max(65, Math.min(95, width * 0.11));
  const gridWidth = width - startZoneWidth;
  const gridHeight = height;

  const colWidth = gridWidth / 10;
  const rowHeight = gridHeight / 5;

  // Visual layout order in the grid (from top-left to bottom-right)
  const visualOrder = [
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
    40, 39, 38, 37, 36, 35, 34, 33, 32, 31,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
    1,  2,  3,  4,  5,  6,  7,  8,  9,  10
  ];

  // Helper to get absolute coordinates relative to parent wrapper
  // Passing isForPath=true offsets the coordinates to the bottom-right corner of the cell
  // to avoid overlapping/covering the cell number and food text.
  const getAbsoluteCoords = (cellNum, isForPath = false) => {
    if (cellNum === 0) {
      // START Zone (vertically centered in bottom row of start column)
      return {
        x: startZoneWidth / 2,
        y: (4 + 0.5) * rowHeight
      };
    }
    const { row, col } = getCellCoords(cellNum);
    if (isForPath) {
      // Shift paths to the bottom-right portion of the cell (perfectly clear of text)
      return {
        x: startZoneWidth + (col + 0.8) * colWidth,
        y: (row + 0.8) * rowHeight
      };
    }
    return {
      x: startZoneWidth + (col + 0.5) * colWidth,
      y: (row + 0.5) * rowHeight
    };
  };

  // Helper to offset overlapping tokens
  const getTokenOffset = (playerId, position) => {
    const playersAtPos = players.filter(p => p.position === position);
    const count = playersAtPos.length;
    if (count <= 1) return { dx: 0, dy: 0 };

    const idx = playersAtPos.findIndex(p => p.id === playerId);
    
    // Scale offsets slightly with board size
    const spacing = Math.min(14, colWidth * 0.2);

    if (count === 2) {
      return { dx: -spacing + idx * (spacing * 2), dy: 0 };
    } else if (count === 3) {
      if (idx === 0) return { dx: 0, dy: -spacing };
      if (idx === 1) return { dx: -spacing, dy: spacing };
      return { dx: spacing, dy: spacing };
    } else {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      return { dx: -spacing + col * (spacing * 2), dy: -spacing + row * (spacing * 2) };
    }
  };

  // Render wooden ladder with custom theme variants
  const renderLadder = (ladder, index) => {
    const p1 = getAbsoluteCoords(ladder.start, true);
    const p2 = getAbsoluteCoords(ladder.end, true);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;

    // Width set to clear, medium-thick visible value
    const halfWidth = 8.5; 

    const rail1X1 = p1.x + px * halfWidth;
    const rail1Y1 = p1.y + py * halfWidth;
    const rail1X2 = p2.x + px * halfWidth;
    const rail1Y2 = p2.y + py * halfWidth;

    const rail2X1 = p1.x - px * halfWidth;
    const rail2Y1 = p1.y - py * halfWidth;
    const rail2X2 = p2.x - px * halfWidth;
    const rail2Y2 = p2.y - py * halfWidth;

    const rungSpacing = 24;
    const numRungs = Math.floor(len / rungSpacing);
    const rungs = [];

    for (let r = 1; r < numRungs; r++) {
      const t = r / numRungs;
      const rx1 = p1.x + t * dx + px * halfWidth;
      const ry1 = p1.y + t * dy + py * halfWidth;
      const rx2 = p1.x + t * dx - px * halfWidth;
      const ry2 = p1.y + t * dy - py * halfWidth;
      rungs.push({ x1: rx1, y1: ry1, x2: rx2, y2: ry2 });
    }

    // Theme-specific styling (high contrast & clear)
    let railStroke = "url(#woodGrad)";
    let rungStroke = "url(#woodGradLight)";
    let jointColor = "#5c3a21";
    let filterStyle = "";
    let opacityVal = "0.85";
    let strokeCap = "round";

    if (theme === 'gelap') {
      railStroke = "#64748B"; // slate grey
      rungStroke = "#475569";
      jointColor = "#0f172a";
      filterStyle = "drop-shadow(0 0 3px rgba(96, 165, 250, 0.5))";
      opacityVal = "0.95";
    } else if (theme === 'retro') {
      railStroke = "#8B4513"; // classic brown
      rungStroke = "#A0522D"; // lighter classic wood
      jointColor = "#000000";
      strokeCap = "square";
      opacityVal = "1.0";
    } else if (theme === 'nusantara') {
      railStroke = "#8b4513"; // traditional dark wood
      rungStroke = "#cd853f"; 
      jointColor = "#3e2723";
      opacityVal = "0.9";
    } else if (theme === 'bahari') {
      railStroke = "#00bcd4"; // blue ship wood
      rungStroke = "#b2ebf2";
      jointColor = "#006064";
      opacityVal = "0.9";
    } else if (theme === 'pasarmalam') {
      railStroke = "#7f1d1d"; // dark lampion wood
      rungStroke = "#fbbf24"; // golden yellow
      jointColor = "#7f1d1d";
      filterStyle = "drop-shadow(0 0 3px rgba(251, 191, 36, 0.4))";
      opacityVal = "0.9";
    }

    return (
      <g key={`ladder-${index}`} className="svg-ladder-group" style={{ filter: filterStyle, opacity: opacityVal }}>
        {/* Soft shadow */}
        <line x1={rail1X1 + 1.5} y1={rail1Y1 + 2} x2={rail1X2 + 1.5} y2={rail1Y2 + 2} stroke="rgba(0,0,0,0.15)" strokeWidth="3.2" strokeLinecap={strokeCap} />
        <line x1={rail2X1 + 1.5} y1={rail2Y1 + 2} x2={rail2X2 + 1.5} y2={rail2Y2 + 2} stroke="rgba(0,0,0,0.15)" strokeWidth="3.2" strokeLinecap={strokeCap} />
        
        {/* Left rail */}
        <line x1={rail1X1} y1={rail1Y1} x2={rail1X2} y2={rail1Y2} stroke={railStroke} strokeWidth="3.2" strokeLinecap={strokeCap} />
        {/* Right rail */}
        <line x1={rail2X1} y1={rail2Y1} x2={rail2X2} y2={rail2Y2} stroke={railStroke} strokeWidth="3.2" strokeLinecap={strokeCap} />
        
        {/* Rungs */}
        {rungs.map((rung, ri) => (
          <g key={`rung-${ri}`}>
            <line x1={rung.x1} y1={rung.y1} x2={rung.x2} y2={rung.y2} stroke={rungStroke} strokeWidth="2.4" strokeLinecap={strokeCap} />
            {theme !== 'retro' && <circle cx={rung.x1} cy={rung.y1} r="1.4" fill={jointColor} />}
            {theme !== 'retro' && <circle cx={rung.x2} cy={rung.y2} r="1.4" fill={jointColor} />}
          </g>
        ))}
      </g>
    );
  };

  // Render colored wavy snake with custom theme variants
  const renderSnake = (snake, index) => {
    const p1 = getAbsoluteCoords(snake.start, true); // Head (higher number)
    const p2 = getAbsoluteCoords(snake.end, true);   // Tail (lower number)

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;

    // Build wave points along the body
    const segments = 32;
    const points = [];
    
    // Variasikan frekuensi dan amplitudo gelombang ular berdasarkan indeksnya
    let waveFreq = 4;
    let waveAmp = 0.08;
    if (index === 0) { waveFreq = 3; waveAmp = 0.09; }
    else if (index === 1) { waveFreq = 5; waveAmp = 0.06; }
    else if (index === 2) { waveFreq = 3.5; waveAmp = 0.10; }
    else if (index === 3) { waveFreq = 4.5; waveAmp = 0.07; }
    else { waveFreq = 2.5; waveAmp = 0.11; }

    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      // Wavy sine curve that narrows towards the tail
      let wave = Math.sin(t * Math.PI * waveFreq) * (len * waveAmp) * (1 - t * 0.4);
      if (theme === 'retro') {
        // Step wave for blocky pixel art look
        wave = Math.round(Math.sin(t * Math.PI * waveFreq) * 2.5) / 2.5 * (len * waveAmp) * (1 - t * 0.4);
      }
      const sx = p1.x + t * dx + px * wave;
      const sy = p1.y + t * dy + py * wave;
      points.push({ x: sx, y: sy });
    }

    const pathData = points.reduce((acc, p, idx) => {
      return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
    }, '');

    // Angle of the head
    const headAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    // Theme-specific colors & details
    let bodyColor = '#2a9d8f'; // bright green
    let patternColor = '#8b4513'; // brown
    let highlightColor = '#e8f5e9';
    let tongueColor = '#e63946';
    let filterStyle = "";
    let opacityVal = "0.85";
    let strokeCap = "round";
    let dashPattern = "7 10";

    if (theme === 'gelap') {
      bodyColor = '#3b82f6'; // neon blue
      patternColor = '#8b5cf6'; // neon purple
      highlightColor = '#93c5fd';
      tongueColor = '#93c5fd';
      filterStyle = "drop-shadow(0 0 3px rgba(139, 92, 246, 0.5))";
      opacityVal = "0.9";
    } else if (theme === 'retro') {
      bodyColor = '#8B5CF6'; // purple
      patternColor = '#EC4899'; // retro pink
      highlightColor = '#00FF00';
      tongueColor = '#EC4899';
      strokeCap = "square";
      opacityVal = "1.0";
      dashPattern = "4 4";
    } else if (theme === 'nusantara') {
      bodyColor = '#15803d'; // forest green
      patternColor = '#166534'; // darker forest green
      highlightColor = '#dcfce7';
      tongueColor = '#b91c1c';
      dashPattern = "4 6 8 6";
      opacityVal = "0.9";
    } else if (theme === 'bahari') {
      bodyColor = '#0288d1'; // sea blue
      patternColor = '#00bcd4'; // turquoise blue
      highlightColor = '#e0f7fa';
      tongueColor = '#ef4444';
      opacityVal = "0.9";
    } else if (theme === 'pasarmalam') {
      bodyColor = '#dc2626'; // brick red
      patternColor = '#fbbf24'; // gold
      highlightColor = '#fef08a';
      tongueColor = '#fbbf24';
      filterStyle = "drop-shadow(0 0 3px rgba(220, 38, 38, 0.3))";
      opacityVal = "0.9";
    }

    return (
      <g key={`snake-${index}`} className="svg-snake-group" style={{ filter: filterStyle, opacity: opacityVal }}>
        {/* Drop shadow (sleek thickness) */}
        <path d={pathData} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="11" strokeLinecap={strokeCap} strokeLinejoin="round" transform="translate(1.5, 2)" />
        
        {/* Main body (thickness: 7.5px) */}
        <path d={pathData} fill="none" stroke={bodyColor} strokeWidth="7.5" strokeLinecap={strokeCap} strokeLinejoin="round" />
        
        {/* Spot/Stripe Pattern */}
        <path d={pathData} fill="none" stroke={patternColor} strokeWidth="7.5" strokeLinecap={strokeCap} strokeLinejoin="round" strokeDasharray={dashPattern} />
        
        {/* Inner highlight */}
        {theme !== 'retro' && <path d={pathData} fill="none" stroke={highlightColor} strokeWidth="1.8" strokeLinecap={strokeCap} strokeLinejoin="round" opacity="0.4" />}

        {/* Tail point */}
        <g transform={`translate(${points[points.length-1].x}, ${points[points.length-1].y})`}>
          {theme === 'retro' ? (
            <rect x="-3" y="-3" width="6" height="6" fill={patternColor} stroke="#000" strokeWidth="0.8" />
          ) : (
            <>
              <circle cx="0" cy="0" r="2.8" fill={patternColor} stroke="#222" strokeWidth="0.8" />
              <circle cx={ux * 1} cy={uy * 1} r="1.4" fill={bodyColor} />
            </>
          )}
        </g>

        {/* Snake Head (chubbier head with funny cartoon eyes) */}
        <g transform={`translate(${p1.x}, ${p1.y}) rotate(${headAngle})`} className="snake-head">
          {/* Flickering Tongue */}
          <path d="M 0,-4 L 0,-13 M 0,-13 L -3.5,-17 M 0,-13 L 3.5,-17" fill="none" stroke={tongueColor} strokeWidth="1.8" strokeLinecap={strokeCap} />
          
          {/* Head Shape */}
          {theme === 'retro' ? (
            <g>
              {/* Variasikan bentuk kepala retro berdasarkan indeks */}
              {index % 2 === 0 ? (
                <>
                  <rect x="-5.5" y="-9.5" width="11" height="13" fill={bodyColor} stroke="#000" strokeWidth="1.2" />
                  <rect x="-3.5" y="-7.5" width="7" height="4.5" fill={patternColor} />
                </>
              ) : (
                <>
                  <rect x="-6" y="-8.5" width="12" height="12" fill={bodyColor} stroke="#000" strokeWidth="1.2" />
                  <rect x="-4" y="-6.5" width="8" height="4" fill={patternColor} />
                </>
              )}
              <rect x="-3" y="-7" width="2" height="2" fill="white" />
              <rect x="-3" y="-7" width="1" height="1" fill="black" />
              <rect x="1" y="-7" width="2" height="2" fill="white" />
              <rect x="1" y="-7" width="1" height="1" fill="black" />
            </g>
          ) : (
            <g>
              {/* Variasikan ukuran & rasio elips kepala berdasarkan indeks */}
              {index % 3 === 0 ? (
                <>
                  {/* Bulat lucu */}
                  <ellipse cx="0" cy="-4" rx="7.8" ry="7.8" fill={bodyColor} stroke="#222" strokeWidth="1.2" />
                  <ellipse cx="0" cy="-5" rx="5.0" ry="3.0" fill={patternColor} opacity="0.8" />
                </>
              ) : index % 3 === 1 ? (
                <>
                  {/* Lonjong lucu */}
                  <ellipse cx="0" cy="-4" rx="6.2" ry="9.8" fill={bodyColor} stroke="#222" strokeWidth="1.2" />
                  <ellipse cx="0" cy="-5" rx="4.0" ry="3.5" fill={patternColor} opacity="0.8" />
                </>
              ) : (
                <>
                  {/* Lebar imut */}
                  <ellipse cx="0" cy="-4" rx="7.2" ry="8.8" fill={bodyColor} stroke="#222" strokeWidth="1.2" />
                  <ellipse cx="0" cy="-5" rx="4.8" ry="2.8" fill={patternColor} opacity="0.8" />
                </>
              )}
              
              {/* Big cartoon eyes with custom pupil directions for unique goofy expressions */}
              <circle cx="-2.2" cy="-5.2" r="2.4" fill="white" />
              <circle cx="-2.2" cy={index % 2 === 0 ? "-5.7" : "-4.8"} r="1.1" fill="black" />
              
              <circle cx="2.2" cy="-5.2" r="2.4" fill="white" />
              <circle cx="2.2" cy={index % 2 === 0 ? "-5.7" : "-4.8"} r="1.1" fill="black" />
            </g>
          )}
        </g>
      </g>
    );
  };

  return (
    <div className="game-board-outer-container">
      {/* Board wrapper containing Start area, Grid and SVGs */}
      <div className="board-grid-wrapper" ref={containerRef}>
        
        {/* Gradient Wood definitions for SVG */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5c3a21" />
              <stop offset="60%" stopColor="#7f4f24" />
              <stop offset="100%" stopColor="#402818" />
            </linearGradient>
            <linearGradient id="woodGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dda15e" />
              <stop offset="100%" stopColor="#bc6c25" />
            </linearGradient>
          </defs>
        </svg>

        {/* START zone column on the left - completely unrotated and clean */}
        <div className="start-zone-col" style={{ width: `${startZoneWidth}px` }}>
          <div className="start-zone-inner">
            <div className="compass-icon">🧭</div>
            <span className="start-label">START</span>
          </div>
        </div>

        {/* SVG Drawing overlay - z-index is set to 2 in globals.css */}
        <svg 
          className="svg-overlay" 
          width={width} 
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          {boardConfig.ladders.map((ladder, idx) => renderLadder(ladder, idx))}
          {boardConfig.snakes.map((snake, idx) => renderSnake(snake, idx))}
        </svg>

        {/* 50 Board squares layout */}
        <div className="board-grid" style={{ width: `${gridWidth}px` }}>
          {visualOrder.map(num => {
            const food = foodData.find(f => f.id === num);
            const region = getRegionForCell(num);

            return (
              <div
                key={num}
                className="board-cell"
                data-region={region}
                onClick={() => onCellClick(food)}
              >
                {/* Wrap text content inside a relative z-index container so it floats above SVGs */}
                <div className="cell-text-container">
                  <div className="cell-num">{num}</div>
                  <div className="cell-food-name" title={food?.name}>
                    {food ? food.name : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Absolute-positioned tokens overlay container */}
        <div className="tokens-overlay-layer">
          {players.map(player => {
            const isAnimating = !!animatingCoords[player.id];
            const coords = isAnimating 
              ? animatingCoords[player.id] 
              : getAbsoluteCoords(player.position);
            const offset = isAnimating 
              ? { dx: 0, dy: 0 } 
              : getTokenOffset(player.id, player.position);

            const isClimbing = player.isClimbing;
            const isSliding = player.isSliding;
            const isMoving = player.isMoving;

            let animClass = '';
            if (isClimbing) animClass = 'token-climbing';
            else if (isSliding) animClass = 'token-sliding';
            else if (isMoving) animClass = 'token-moving';
            
            return (
              <div
                key={player.id}
                className={`player-token-container ${animClass}`}
                style={{ 
                  left: `${coords.x + offset.dx}px`,
                  top: `${coords.y + offset.dy}px`,
                  '--player-color': player.color,
                  boxShadow: `0 0 12px ${player.color}, 0 4px 10px rgba(0,0,0,0.3)`
                }}
                title={`${player.name} (Kotak ${player.position === 0 ? 'START' : player.position})`}
              >
                <img 
                  src={player.avatar || `/characters/char${player.id}.svg`} 
                  alt={player.name} 
                  className="token-char-img" 
                />
                <span className="token-label-indicator">P{player.id}</span>
              </div>
            );
          })}
        </div>

      </div>

      {/* Horizontal Legend at the bottom of the board area */}
      <div className="board-legend">
        <span className="legend-title font-accent">🗺️ Legenda Wilayah:</span>
        <div className="legend-items">
          <div className="legend-item" data-region="Jawa">
            <span className="legend-color-dot"></span>
            <span className="legend-text">Jawa (1-10)</span>
          </div>
          <div className="legend-item" data-region="Sulawesi">
            <span className="legend-color-dot"></span>
            <span className="legend-text">Sulawesi (11-20)</span>
          </div>
          <div className="legend-item" data-region="Kalimantan">
            <span className="legend-color-dot"></span>
            <span className="legend-text">Kalimantan (21-30)</span>
          </div>
          <div className="legend-item" data-region="Sumatra">
            <span className="legend-color-dot"></span>
            <span className="legend-text">Sumatra (31-40)</span>
          </div>
          <div className="legend-item" data-region="Papua">
            <span className="legend-color-dot"></span>
            <span className="legend-text">Papua (41-50)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
