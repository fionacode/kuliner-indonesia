import React from 'react';

export default function PlayerList({ players, activePlayerIndex }) {
  // Sort players so the active player is always at the top of the list
  const sortedPlayers = [...players].sort((a, b) => {
    const isAActive = players.indexOf(a) === activePlayerIndex;
    const isBActive = players.indexOf(b) === activePlayerIndex;
    if (isAActive && !isBActive) return -1;
    if (!isAActive && isBActive) return 1;
    return 0;
  });

  return (
    <div className="player-list-component">
      <h3 className="sidebar-section-title">👤 Daftar Penjelajah</h3>
      <div className="players-container">
        {sortedPlayers.map((player) => {
          const isActive = players.indexOf(player) === activePlayerIndex;
          return (
            <div 
              key={player.id} 
              className={`player-item-card ${isActive ? 'active-card animate-pulse-glow' : ''}`}
              style={{ '--player-color': player.color }}
            >
              <div className="player-item-header">
                <span 
                  className="player-avatar" 
                  style={{ backgroundColor: player.color }}
                >
                  P{player.id}
                </span>
                <span className="player-name-label">
                  <strong>{player.name}</strong>
                  {player.rank ? (
                    <span className="rank-badge-pill">Juara {player.rank} {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : '🏅'}</span>
                  ) : (
                    isActive && <span className="active-badge">Giliran</span>
                  )}
                </span>
              </div>
              <div className="player-item-details">
                <p className="player-box-info">
                  Sedang berada di kotak: <strong>{player.position === 0 ? 'START' : player.position}</strong>
                </p>
                <div className="player-stats-row">
                  <span className="stat-label-correct">Jawaban Benar: <strong>{player.correctCount}</strong></span>
                  <span className="stat-label-incorrect">Jawaban Salah: <strong>{player.incorrectCount}</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
