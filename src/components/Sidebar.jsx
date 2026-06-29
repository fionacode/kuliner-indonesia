import React from 'react';
import Dice from './Dice';
import PlayerList from './PlayerList';
import MusicControl from './MusicControl';
import { getRegionForCell } from '../data/boardConfig';
import { foodData } from '../data/foodData';

const themes = [
  { id: 'terang', label: 'Terang', icon: '☀️' },
  { id: 'gelap', label: 'Gelap', icon: '🌙' },
  { id: 'retro', label: 'Retro', icon: '👾' },
  { id: 'nusantara', label: 'Nusantara', icon: '🪵' },
  { id: 'bahari', label: 'Bahari', icon: '🌊' },
  { id: 'pasarmalam', label: 'Pasar Malam', icon: '🏮' }
];

export default function Sidebar({
  players,
  activePlayerIndex,
  diceValue,
  isDiceRolling,
  isTokenMoving,
  onRollDice,
  isGameStarted,
  theme,
  onThemeChange
}) {
  const activePlayer = players[activePlayerIndex];
  const currentBoxNum = activePlayer?.position || 0;
  const currentRegion = getRegionForCell(currentBoxNum);
  const currentFood = foodData.find(f => f.id === currentBoxNum);

  return (
    <aside className="sidebar-container">
      {/* Game Title */}
      <div className="sidebar-brand">
        <h2>🗺️ Nusantara</h2>
        <span className="brand-badge">Kuliner Adventure</span>
      </div>

      {/* Dynamic Theme Switcher */}
      <section className="sidebar-section theme-switcher-section">
        <h3 className="sidebar-section-title">🎨 Pilih Tema</h3>
        <div className="theme-selector-grid">
          {themes.map(t => (
            <button
              key={t.id}
              className={`theme-compact-btn ${theme === t.id ? 'active' : 'inactive'}`}
              onClick={() => onThemeChange && onThemeChange(t.id)}
              title={`Ganti ke tema ${t.label}`}
            >
              <span className="theme-btn-icon">{t.icon}</span>
              <span className="theme-btn-label">{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Music and Volume Controls */}
      <MusicControl isGameStarted={isGameStarted} theme={theme} />

      {/* A. Roll Dice Section */}
      <section className="sidebar-section dice-section">
        <h3 className="sidebar-section-title">🎲 Langkah Penjelajah</h3>
        <Dice 
          value={diceValue} 
          isRolling={isDiceRolling} 
          isTokenMoving={isTokenMoving}
          onRoll={onRollDice} 
        />
      </section>

      {/* B. Active Player Current Info */}
      {activePlayer && (
        <section className="sidebar-section active-turn-section">
          <h3 className="sidebar-section-title">👉 Giliran Aktif</h3>
          <div className="active-player-info-card" style={{ borderColor: activePlayer.color }}>
            <div className="active-player-name-row">
              <span className="color-dot" style={{ backgroundColor: activePlayer.color }}></span>
              <strong>{activePlayer.name}</strong>
            </div>
            
            <div className="active-player-stats-row">
              <div className="active-stat-item">
                <span className="stat-label">Posisi Sekarang</span>
                <span className="stat-val">
                  {currentBoxNum === 0 ? 'START' : `Kotak ${currentBoxNum}`}
                </span>
              </div>
              <div className="active-stat-item">
                <span className="stat-label">Wilayah Kuliner</span>
                <span className="stat-val font-accent" data-region={currentRegion}>
                  {currentBoxNum === 0 ? '-' : `Pulau ${currentRegion}`}
                </span>
              </div>
            </div>

            <div className="active-food-row">
              <span className="food-label">Kuliner Kotak Ini:</span>
              <strong className="food-val">
                {currentBoxNum === 0 ? 'Area Mulai' : (currentFood ? currentFood.name : 'Memuat...')}
              </strong>
            </div>
          </div>
        </section>
      )}

      {/* C. Leaderboard/Player List */}
      <section className="sidebar-section player-list-section">
        <PlayerList 
          players={players} 
          activePlayerIndex={activePlayerIndex} 
        />
      </section>


    </aside>
  );
}
