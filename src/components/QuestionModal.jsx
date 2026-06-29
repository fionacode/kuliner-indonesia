import React, { useState, useEffect } from 'react';
import audioSystem from '../utils/audioSystem';
import { boardConfig } from '../data/boardConfig';

export default function QuestionModal({ player, food, question, onAnswer }) {
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [correctIndex, setCorrectIndex] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (question) {
      const originalOptions = question.options;
      
      // Map options to keep track of the correct answer flag
      const optionsWithFlags = originalOptions.map((opt, idx) => ({
        text: opt,
        isCorrect: idx === question.answerIndex
      }));

      // Shuffle options using a robust random sort
      const shuffled = [...optionsWithFlags].sort(() => Math.random() - 0.5);
      
      setShuffledOptions(shuffled.map(o => o.text));
      setCorrectIndex(shuffled.findIndex(o => o.isCorrect));
      setSelectedIdx(null);
      setIsSubmitted(false);
      setParticles([]);
    }
  }, [question]);

  const handleOptionClick = (idx) => {
    if (isSubmitted) return;
    setSelectedIdx(idx);
    setIsSubmitted(true);
    
    const isCorrect = idx === correctIndex;

    // Trigger select audio feedback immediately
    audioSystem.playSFX('select_answer');

    // Trigger correct/incorrect audio feedback after a brief delay so they don't overlap awkwardly
    setTimeout(() => {
      audioSystem.playSFX(isCorrect ? 'correct' : 'incorrect');
    }, 150);

    // Create particles for correct answers
    if (isCorrect) {
      const newParticles = Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        x: 40 + Math.random() * 20, // Center cluster horizontally
        y: 50 + Math.random() * 20, // Center cluster vertically
        size: 6 + Math.random() * 12,
        delay: Math.random() * 0.3,
        dx: (Math.random() - 0.5) * 160, // scatter distance X
        dy: -(50 + Math.random() * 150), // shoot upwards Y
        color: ['#2a9d8f', '#ffb703', '#e76f51', '#457b9d', '#ff007f'][Math.floor(Math.random() * 5)]
      }));
      setParticles(newParticles);
    }

    // Delay the completion handler by 1.6s so player can see feedback and particle effects
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 1600);
  };

  const isCorrect = selectedIdx === correctIndex;

  return (
    <div className="modal-overlay no-click-close">
      {/* Particle explosion effect */}
      <div className="particle-container">
        {particles.map(p => (
          <span 
            key={p.id} 
            className="burst-particle" 
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              backgroundColor: p.color,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`
            }}
          />
        ))}
      </div>

      <div className="modal-card question-card animate-pop-in">
        <div className="question-header" style={{ borderBottomColor: player.color }}>
          <div className="player-turn-indicator">
            <span 
              className="player-dot" 
              style={{ backgroundColor: player.color }}
            />
            Pertanyaan untuk <strong>{player.name}</strong>
          </div>
          <div className="box-badge" data-region={food.region}>
            Kotak {food.id}: {food.name} ({food.region})
          </div>
        </div>

        <div className="question-body">
          <h2 className="question-text">{question.question}</h2>

          <div className="options-grid">
            {shuffledOptions.map((option, idx) => {
              let btnClass = '';
              if (isSubmitted) {
                if (idx === correctIndex) {
                  btnClass = 'correct-option';
                } else if (idx === selectedIdx) {
                  btnClass = 'incorrect-option';
                } else {
                  btnClass = 'disabled-option';
                }
              } else if (selectedIdx === idx) {
                btnClass = 'selected-option';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  className={`option-btn ${btnClass}`}
                  onClick={() => handleOptionClick(idx)}
                  disabled={isSubmitted}
                  onMouseEnter={() => {
                    if (!isSubmitted) audioSystem.playSFX('hover_option');
                  }}
                >
                  <span className="option-letter">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="option-label-text">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isSubmitted && (() => {
          const ladder = boardConfig.ladders.find(l => l.start === food.id);
          const snake = boardConfig.snakes.find(s => s.start === food.id);
          return (
            <div className={`answer-feedback ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'} animate-slide-up`}>
              <div className="feedback-icon">{isCorrect ? '🎉' : '❌'}</div>
              <div className="feedback-message">
                {isCorrect ? (
                  <>
                    <h3>Jawaban Benar!</h3>
                    {ladder ? (
                      <p>Jawaban benar! Anda naik ke kotak {ladder.end}.</p>
                    ) : snake ? (
                      <p>Selamat! Anda berhasil menghindari ular dan tetap berada di kotak {food.id}.</p>
                    ) : (
                      <p>Hebat! Anda tetap berada di kotak {food.id}.</p>
                    )}
                  </>
                ) : (
                  <>
                    <h3>Jawaban Salah!</h3>
                    {ladder ? (
                      <p>Jawaban salah. Anda gagal menaiki tangga dan tetap berada di kotak {food.id}.</p>
                    ) : snake ? (
                      <p>Jawaban salah. Anda tergelincir oleh ular dan turun ke kotak {snake.end}.</p>
                    ) : (
                      <p>Sayang sekali. Anda harus kembali ke posisi sebelumnya.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
