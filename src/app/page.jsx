'use client';

import React, { useState, useEffect } from 'react';
import SetupScreen from '../components/SetupScreen';
import GameBoard from '../components/GameBoard';
import Sidebar from '../components/Sidebar';
import FoodInfoModal from '../components/FoodInfoModal';
import QuestionModal from '../components/QuestionModal';
import { boardConfig } from '../data/boardConfig';
import { foodData } from '../data/foodData';
import audioSystem from '../utils/audioSystem';

export default function Home() {
  // Game states: 'setup' | 'playing' | 'winner'
  const [gameState, setGameState] = useState('setup');
  const [theme, setTheme] = useState('terang');
  const [players, setPlayers] = useState([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  
  const [diceValue, setDiceValue] = useState(null);
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  const [isTokenMoving, setIsTokenMoving] = useState(false);
  const [previousPosition, setPreviousPosition] = useState(0);

  // Modals state
  const [foodForInfo, setFoodForInfo] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null); // { food, question }
  const [winnerPlayer, setWinnerPlayer] = useState(null);
  const [victoryParticles, setVictoryParticles] = useState([]);
  const [boxAskCounts, setBoxAskCounts] = useState({});

  // Generate victory confetti when game state becomes 'winner'
  useEffect(() => {
    if (gameState === 'winner') {
      const newParticles = Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: -10 - Math.random() * 20,
        size: 7 + Math.random() * 12,
        delay: Math.random() * 4,
        duration: 2.5 + Math.random() * 3.5,
        rotation: Math.random() * 360,
        color: ['#f72585', '#7209b7', '#3f37c9', '#4cc9f0', '#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#2a9d8f'][Math.floor(Math.random() * 9)],
        shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)]
      }));
      setVictoryParticles(newParticles);
    } else {
      setVictoryParticles([]);
    }
  }, [gameState]);

  // 1. Initialize and Start Game
  const handleStartGame = (initializedPlayers, chosenTheme) => {
    setTheme(chosenTheme);
    setPlayers(initializedPlayers);
    setActivePlayerIndex(0);
    setGameState('playing');
    setDiceValue(null);
    setIsDiceRolling(false);
    setIsTokenMoving(false);
    setPreviousPosition(0);
    setWinnerPlayer(null);
    setBoxAskCounts({});
    
    // Play theme-specific backsound
    audioSystem.changeTheme(chosenTheme);
  };

  // Helper to animate token cell-by-cell (handles both forward and backward)
  const animateSteps = (playerId, fromPos, toPos, callback) => {
    if (fromPos === toPos) {
      if (callback) callback();
      return;
    }

    const step = toPos > fromPos ? 1 : -1;
    const nextPos = fromPos + step;

    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, position: nextPos } : p
    ));

    // Play soft tick sound for intermediate moves instead of loud dice roll
    audioSystem.playSFX('step');

    setTimeout(() => {
      animateSteps(playerId, nextPos, toPos, callback);
    }, 280); // speed of individual cell step
  };

  // 2. Roll Dice Handler
  const handleRollDice = () => {
    if (isDiceRolling || isTokenMoving || gameState !== 'playing') return;

    setIsDiceRolling(true);
    setDiceValue(null);
    audioSystem.playSFX('dice');

    // Simulate dice rolling delay (dadu berputar)
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceValue(roll);
      setIsDiceRolling(false);

      const activePlayer = players[activePlayerIndex];
      const prevPos = activePlayer.position;
      setPreviousPosition(prevPos);

      // Calculate temporary landing box
      let tempPos = prevPos + roll;
      if (tempPos >= 50) tempPos = 50;

      // Pause for 900ms to let the player read the dice result face
      setTimeout(() => {
        setIsTokenMoving(true);
        // Set character moving flag
        setPlayers(prev => prev.map(p => 
          p.id === activePlayer.id ? { ...p, isMoving: true } : p
        ));

        // Animate player token cell-by-cell forward
        animateSteps(activePlayer.id, prevPos, tempPos, () => {
          // Clear character moving flag
          setPlayers(prev => prev.map(p => 
            p.id === activePlayer.id ? { ...p, isMoving: false } : p
          ));
          setIsTokenMoving(false);
          
          // Update stats (steps count)
          setPlayers(prev => prev.map((p, idx) => 
            idx === activePlayerIndex ? { ...p, totalSteps: p.totalSteps + 1 } : p
          ));

          // Wait a short moment and show question
          setTimeout(() => {
            const foodItem = foodData.find(f => f.id === tempPos);

            if (foodItem) {
              // Determine rotation question index: visits 0-4 get questions A-E, subsequent visits get random questions
              const currentCount = boxAskCounts[tempPos] || 0;
              let questionIdx = 0;
              if (currentCount < 5) {
                questionIdx = currentCount;
              } else {
                questionIdx = Math.floor(Math.random() * foodItem.questions.length);
              }

              // Increment ask count for this box
              setBoxAskCounts(prev => ({
                ...prev,
                [tempPos]: (prev[tempPos] || 0) + 1
              }));

              const question = foodItem.questions[questionIdx];
              
              setActiveQuestion({
                food: foodItem,
                question: question
              });
            }
          }, 300);
        });
      }, 900); // Wait 900ms after roll result appears

    }, 1200); // dice roll animation duration
  };

  // 3. Question Answering Handler (Kuis Otomatis Tanpa Tombol Lanjutkan)
  const handleAnswerQuestion = (isCorrect) => {
    const activePlayer = players[activePlayerIndex];
    const targetFood = activeQuestion.food;
    let nextPos = targetFood.id;

    // Immediately close the question modal
    setActiveQuestion(null);
    setIsTokenMoving(true);

    if (isCorrect) {
      // Update correct stats immediately
      setPlayers(prev => prev.map((p, idx) => 
        idx === activePlayerIndex 
          ? { ...p, correctCount: p.correctCount + 1 } 
          : p
      ));

      // Check for Snakes & Ladders
      const ladder = boardConfig.ladders.find(l => l.start === targetFood.id);
      const snake = boardConfig.snakes.find(s => s.start === targetFood.id);

      if (ladder) {
        nextPos = ladder.end;
      } else if (snake) {
        nextPos = snake.end;
      }

      const isSnakeOrLadder = targetFood.id !== nextPos;
      
      if (isSnakeOrLadder) {
        const isLadder = nextPos > targetFood.id;
        audioSystem.playSFX(isLadder ? 'ladder' : 'snake');
        
        // Trigger specific animation flag on the player (climbing or sliding)
        setPlayers(prev => prev.map(p => 
          p.id === activePlayer.id 
            ? { ...p, isClimbing: isLadder, isSliding: !isLadder } 
            : p
        ));

        // Shift position immediately in React state (GameBoard will transition left/top over 1.1s)
        setPlayers(prev => prev.map(p => 
          p.id === activePlayer.id ? { ...p, position: nextPos } : p
        ));

        // Wait for slide transition to complete
        setTimeout(() => {
          // Clear animation flags
          setPlayers(prev => prev.map(p => 
            p.id === activePlayer.id 
              ? { ...p, isClimbing: false, isSliding: false } 
              : p
          ));
          setIsTokenMoving(false);
          checkWinAndAdvance(nextPos, activePlayer);
        }, 1200); // matches slide duration
      } else {
        setIsTokenMoving(false);
        checkWinAndAdvance(nextPos, activePlayer);
      }
    } else {
      // Revert back to original position
      nextPos = previousPosition;

      // Update incorrect stats immediately
      setPlayers(prev => prev.map((p, idx) => 
        idx === activePlayerIndex 
          ? { ...p, incorrectCount: p.incorrectCount + 1 } 
          : p
      ));

      // Animate walking back step-by-step
      setPlayers(prev => prev.map(p => 
        p.id === activePlayer.id ? { ...p, isMoving: true } : p
      ));

      // Wait a tiny moment before walking back
      setTimeout(() => {
        animateSteps(activePlayer.id, targetFood.id, nextPos, () => {
          setPlayers(prev => prev.map(p => 
            p.id === activePlayer.id ? { ...p, isMoving: false } : p
          ));
          setIsTokenMoving(false);
          checkWinAndAdvance(nextPos, activePlayer);
        });
      }, 200);
    }
  };

  const checkWinAndAdvance = (pos, player) => {
    if (pos === 50) {
      audioSystem.playSFX('win');
      setWinnerPlayer(player);
      setGameState('winner');
      return;
    }
    // Switch turns
    setActivePlayerIndex(prevIdx => (prevIdx + 1) % players.length);
  };

  const handlePlayAgain = () => {
    setGameState('setup');
    setPlayers([]);
    setWinnerPlayer(null);
    setDiceValue(null);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    audioSystem.changeTheme(newTheme);
  };

  return (
    <div className="game-wrapper" data-theme={theme}>
      {gameState === 'setup' && (
        <SetupScreen onStartGame={handleStartGame} />
      )}

      {gameState === 'playing' && (
        <div className="main-game-layout">
          {/* Main Board Area */}
          <main className="board-area">
            <header className="game-board-header">
              <h1>Jelajah Kuliner Nusantara</h1>
              <p className="subtitle-adventure">Klik kotak untuk membaca informasi kuliner Nusantara!</p>
            </header>

            <GameBoard 
              players={players} 
              theme={theme}
              onCellClick={(food) => setFoodForInfo(food)} 
            />
          </main>

          {/* Sidebar Area */}
          <Sidebar
            players={players}
            activePlayerIndex={activePlayerIndex}
            diceValue={diceValue}
            isDiceRolling={isDiceRolling}
            isTokenMoving={isTokenMoving}
            onRollDice={handleRollDice}
            isGameStarted={true}
            theme={theme}
            onThemeChange={handleThemeChange}
          />
        </div>
      )}

      {/* Winner Screen Popup */}
      {gameState === 'winner' && winnerPlayer && (
        <div className="modal-overlay winner-overlay">
          {/* Falling Confetti Pieces */}
          <div className="victory-confetti-container">
            {victoryParticles.map(p => (
              <div 
                key={p.id} 
                className={`confetti-piece ${p.shape}`}
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.shape !== 'triangle' ? p.color : undefined,
                  borderBottomColor: p.shape === 'triangle' ? p.color : undefined,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  transform: `rotate(${p.rotation}deg)`,
                  '--rotation-end': `${p.rotation + 360 + Math.random() * 360}deg`
                }}
              />
            ))}
          </div>

          <div className="modal-card winner-card animate-pop-in">
            <div className="winner-confetti">🏆👑🥇</div>
            <h2>Selamat untuk Sang Juara!</h2>
            <h1 className="winner-name" style={{ color: winnerPlayer.color }}>
              {winnerPlayer.name}
            </h1>
            <p className="winner-sub">Telah berhasil menjelajah dan mencapai Kotak 50!</p>
            
            <div className="winner-stats-grid">
              <div className="winner-stat-card">
                <span>Jawaban Benar</span>
                <strong className="text-success">✅ {winnerPlayer.correctCount}</strong>
              </div>
              <div className="winner-stat-card">
                <span>Jawaban Salah</span>
                <strong className="text-danger">❌ {winnerPlayer.incorrectCount}</strong>
              </div>
              <div className="winner-stat-card">
                <span>Total Langkah Dadu</span>
                <strong className="text-primary">🎲 {winnerPlayer.totalSteps}</strong>
              </div>
            </div>

            <h3 className="stats-comparison-title">Statistik Penjelajah Lain:</h3>
            <div className="comparison-list">
              {players.map(p => (
                <div key={p.id} className="comparison-row" style={{ borderLeftColor: p.color }}>
                  <span><strong>{p.name}</strong> (Kotak {p.position === 0 ? 'START' : p.position})</span>
                  <span>Benar: {p.correctCount} | Salah: {p.incorrectCount} | Langkah: {p.totalSteps}</span>
                </div>
              ))}
            </div>

            <button onClick={handlePlayAgain} className="play-again-btn">
              Main Lagi 🔄
            </button>
          </div>
        </div>
      )}

      {/* Info Modal Triggered by Clicking Board Cells */}
      {foodForInfo && (
        <FoodInfoModal 
          food={foodForInfo} 
          onClose={() => setFoodForInfo(null)} 
        />
      )}

      {/* Question Modal Triggered by Landing on Cells */}
      {activeQuestion && (
        <div className="modal-overlay no-click-close">
          <QuestionModal
            player={players[activePlayerIndex]}
            food={activeQuestion.food}
            question={activeQuestion.question}
            onAnswer={handleAnswerQuestion}
          />
        </div>
      )}
    </div>
  );
}
