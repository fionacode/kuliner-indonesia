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
import AboutModal from '../components/AboutModal';

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
  const [rankNotification, setRankNotification] = useState(null);
  const [victoryParticles, setVictoryParticles] = useState([]);
  const [boxAskCounts, setBoxAskCounts] = useState({});
  const [isAboutOpen, setIsAboutOpen] = useState(false);

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
    let isLadderClimb = false;
    let isSnakeSlide = false;

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

      // Check if there is a ladder starting at targetFood.id
      const ladder = boardConfig.ladders.find(l => l.start === targetFood.id);
      if (ladder) {
        nextPos = ladder.end;
        isLadderClimb = true;
      }
      // If it's a snake, correct answer avoids sliding and stays at targetFood.id
    } else {
      // Update incorrect stats immediately
      setPlayers(prev => prev.map((p, idx) => 
        idx === activePlayerIndex 
          ? { ...p, incorrectCount: p.incorrectCount + 1 } 
          : p
      ));

      // Check if there is a snake starting at targetFood.id
      const snake = boardConfig.snakes.find(s => s.start === targetFood.id);
      const ladder = boardConfig.ladders.find(l => l.start === targetFood.id);

      if (snake) {
        nextPos = snake.end;
        isSnakeSlide = true;
      } else if (ladder) {
        // Incorrect on ladder -> stay at ladder start (targetFood.id)
        nextPos = targetFood.id;
      } else {
        // Normal square -> go back to previous position
        nextPos = previousPosition;
      }
    }

    // Now decide which animation/movement type to trigger
    if (isLadderClimb || isSnakeSlide) {
      audioSystem.playSFX(isLadderClimb ? 'ladder' : 'snake');
      
      // Trigger specific animation flag on the player (climbing or sliding)
      setPlayers(prev => prev.map(p => 
        p.id === activePlayer.id 
          ? { ...p, isClimbing: isLadderClimb, isSliding: isSnakeSlide } 
          : p
      ));

      // Shift position immediately in React state
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
      }, 1200);
    } else if (nextPos === previousPosition) {
      // Walk back step-by-step
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
    } else {
      // Stays where they are (either correct on normal/snake, or incorrect on ladder)
      setIsTokenMoving(false);
      checkWinAndAdvance(nextPos, activePlayer);
    }
  };

  const advanceTurn = (currentPlayers, skipPlayerId) => {
    let nextIdx = activePlayerIndex;
    for (let i = 1; i <= currentPlayers.length; i++) {
      const idx = (activePlayerIndex + i) % currentPlayers.length;
      const p = currentPlayers[idx];
      if (p.id !== skipPlayerId && !p.rank) {
        nextIdx = idx;
        break;
      }
    }
    setActivePlayerIndex(nextIdx);
  };

  const checkWinAndAdvance = (pos, activePlayer) => {
    if (pos === 50) {
      const rankedCount = players.filter(p => p.rank).length;
      const assignedRank = rankedCount + 1;

      // Update state for this player
      setPlayers(prev => prev.map(p => 
        p.id === activePlayer.id ? { ...p, rank: assignedRank } : p
      ));

      // Calculate unranked players left
      const unrankedLeft = players.length - (rankedCount + 1);

      if (unrankedLeft <= 1) {
        // Game over! Last remaining player gets the last rank
        setPlayers(prev => prev.map(p => {
          if (p.id === activePlayer.id) {
            return { ...p, rank: assignedRank };
          }
          if (!p.rank) {
            return { ...p, rank: players.length };
          }
          return p;
        }));

        audioSystem.playSFX('win');
        setTimeout(() => {
          setGameState('winner');
        }, 800);
      } else {
        // Show intermediate rank notification
        audioSystem.playSFX('win');
        setRankNotification({
          playerName: activePlayer.name,
          color: activePlayer.color,
          rank: assignedRank
        });

        // Advance turn now, skipping the current player who just finished
        advanceTurn(players, activePlayer.id);
      }
      return;
    }

    // Switch turns
    advanceTurn(players);
  };

  const handlePlayAgain = () => {
    setGameState('setup');
    setPlayers([]);
    setActivePlayerIndex(0);
    setDiceValue(null);
    setIsDiceRolling(false);
    setIsTokenMoving(false);
    setPreviousPosition(0);
    setFoodForInfo(null);
    setActiveQuestion(null);
    setWinnerPlayer(null);
    setRankNotification(null);
    setBoxAskCounts({});
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    audioSystem.changeTheme(newTheme);
  };

  const handleDismissRankNotification = () => {
    setRankNotification(null);
  };

  const activePlayer = players[activePlayerIndex];
  const rank1Player = players.find(p => p.rank === 1);
  const sortedRankings = [...players].sort((a, b) => (a.rank || 99) - (b.rank || 99));

  return (
    <div className="game-wrapper" data-theme={theme}>
      {gameState === 'setup' && (
        <SetupScreen 
          onStartGame={handleStartGame} 
          theme={theme}
          onThemeChange={handleThemeChange}
          onAboutClick={() => setIsAboutOpen(true)}
        />
      )}

      {gameState === 'playing' && (
        <>
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
              onAboutClick={() => setIsAboutOpen(true)}
            />
          </div>

          {/* Panel Kontrol Lekat khusus Mobile */}
          {activePlayer && (
            <div className="mobile-sticky-control-panel">
              <div className="mobile-active-player">
                <span 
                  className="mobile-color-dot" 
                  style={{ backgroundColor: activePlayer.color }}
                />
                <div className="mobile-player-info">
                  <span className="mobile-label">Giliran</span>
                  <strong className="mobile-name">{activePlayer.name}</strong>
                </div>
              </div>

              <div className="mobile-dice-section">
                <span className="mobile-label">Dadu</span>
                <div className="mobile-dice-value">
                  {diceValue ? (
                    <span className="mobile-dice-num">🎲 {diceValue}</span>
                  ) : (
                    <span className="mobile-dice-empty">-</span>
                  )}
                </div>
              </div>

              <button
                onClick={handleRollDice}
                disabled={isDiceRolling || isTokenMoving}
                className="mobile-roll-btn"
              >
                {isDiceRolling ? 'Mengocok...' : isTokenMoving ? 'Bidak...' : 'Lempar 🎲'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Winner Screen Popup */}
      {gameState === 'winner' && rank1Player && (
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
            <h1 className="winner-name" style={{ color: rank1Player.color }}>
              {rank1Player.name}
            </h1>
            <p className="winner-sub">Telah berhasil menyelesaikan petualangan kuliner Nusantara!</p>

            <h3 className="stats-comparison-title" style={{ marginTop: '1.5rem' }}>Peringkat Akhir Penjelajah:</h3>
            <div className="rankings-list">
              {sortedRankings.map((p, idx) => {
                const rankEmojis = ['🥇', '🥈', '🥉', '🏅'];
                const rankLabel = `Juara ${p.rank || (idx + 1)}`;
                const medal = rankEmojis[(p.rank || (idx + 1)) - 1] || '🏅';
                return (
                  <div key={p.id} className="ranking-item-row" style={{ borderLeft: `6px solid ${p.color}` }}>
                    <div className="ranking-rank-info">
                      <span className="ranking-medal-icon">{medal}</span>
                      <span className="ranking-rank-text">{rankLabel}</span>
                    </div>
                    <div className="ranking-player-info">
                      <strong className="ranking-player-name-text" style={{ color: p.color }}>{p.name}</strong>
                      <div className="ranking-player-stats-text">
                        Benar: {p.correctCount} | Salah: {p.incorrectCount} | {p.totalSteps} langkah
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={handlePlayAgain} className="play-again-btn">
              Main Lagi 🔄
            </button>
          </div>
        </div>
      )}

      {/* Intermediate Rank Notification Modal */}
      {rankNotification && (
        <div className="modal-overlay rank-notif-overlay">
          <div className="modal-card rank-notif-card animate-pop-in">
            <div className="rank-notif-medal">
              {rankNotification.rank === 1 ? '🥇' : rankNotification.rank === 2 ? '🥈' : rankNotification.rank === 3 ? '🥉' : '🏅'}
            </div>
            <h2>Selamat!</h2>
            <h1 className="rank-notif-player-name" style={{ color: rankNotification.color }}>
              {rankNotification.playerName}
            </h1>
            <p className="rank-notif-sub">
              Mencapai Kotak 50 dan meraih peringkat <strong>Juara {rankNotification.rank}</strong>!
            </p>
            <p className="rank-notif-desc">
              Pemain lain tetap melanjutkan permainan untuk memperebutkan peringkat selanjutnya.
            </p>
            <button onClick={handleDismissRankNotification} className="rank-notif-btn">
              Lanjutkan Permainan 🚀
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

      {/* About Game Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        theme={theme}
      />
    </div>
  );
}
