import React, { useState } from 'react';
import audioSystem from '../utils/audioSystem';

const characterTemplates = [
  { id: 'char1', name: 'Petualang', file: '/characters/char1.svg', color: '#e63946', label: 'Anak Petualang' },
  { id: 'char2', name: 'Koki', file: '/characters/char2.svg', color: '#457b9d', label: 'Koki Nusantara' },
  { id: 'char3', name: 'Blogger', file: '/characters/char3.svg', color: '#2a9d8f', label: 'Food Blogger' },
  { id: 'char4', name: 'Pemandu', file: '/characters/char4.svg', color: '#e9c46a', label: 'Pemandu Lokal' },
];

export default function SetupScreen({ onStartGame }) {
  const [numPlayers, setNumPlayers] = useState(2);
  const [selectedTheme, setSelectedTheme] = useState('terang');
  const [playerNames, setPlayerNames] = useState({
    player1: 'Penjelajah 1',
    player2: 'Penjelajah 2',
    player3: 'Penjelajah 3',
    player4: 'Penjelajah 4'
  });
  const [playerCharacters, setPlayerCharacters] = useState({
    player1: 'char1',
    player2: 'char2',
    player3: 'char3',
    player4: 'char4'
  });

  const themes = [
    { id: 'terang', label: 'Terang', icon: '☀️' },
    { id: 'gelap', label: 'Gelap', icon: '🌙' },
    { id: 'retro', label: 'Retro', icon: '👾' },
    { id: 'nusantara', label: 'Nusantara', icon: '🪵' },
    { id: 'bahari', label: 'Bahari', icon: '🌊' },
    { id: 'pasarmalam', label: 'Pasar Malam', icon: '🏮' }
  ];

  const handleNameChange = (key, val) => {
    setPlayerNames(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleNumPlayersChange = (count) => {
    setNumPlayers(count);
    audioSystem.playSFX('select_players');
  };

  const handleCharacterChange = (playerKey, charId) => {
    setPlayerCharacters(prev => ({
      ...prev,
      [playerKey]: charId
    }));
    // Play a small sound feedback
    audioSystem.playSFX('select_character');
  };

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    // Automatically change the backsound based on theme selection
    audioSystem.changeTheme(themeId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const playersList = [];
    for (let i = 1; i <= numPlayers; i++) {
      const nameKey = `player${i}`;
      const chosenCharId = playerCharacters[nameKey];
      const charTemplate = characterTemplates.find(c => c.id === chosenCharId) || characterTemplates[i - 1];

      playersList.push({
        id: i,
        name: playerNames[nameKey].trim() || `Pemain ${i}`,
        color: charTemplate.color,
        avatar: charTemplate.file,
        characterName: charTemplate.label,
        position: 0, // Starts at 0 (START area)
        correctCount: 0,
        incorrectCount: 0,
        totalSteps: 0,
        score: 0
      });
    }
    onStartGame(playersList, selectedTheme);
  };

  return (
    <div className="setup-container" data-theme={selectedTheme}>
      <div className="setup-card">
        <div className="setup-header">
          <div className="logo-badge">🍽️ Nusantara</div>
          <h1>Jelajah Kuliner Nusantara</h1>
          <p className="setup-subtitle">Petualangan kuliner Indonesia yang edukatif dan menyenangkan</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          {/* Player Count selection */}
          <div className="form-group">
            <label className="section-label">Pilih Jumlah Penjelajah</label>
            <div className="player-count-selector">
              {[2, 3, 4].map(count => (
                <button
                  key={count}
                  type="button"
                  className={`count-btn ${numPlayers === count ? 'active' : ''}`}
                  onClick={() => handleNumPlayersChange(count)}
                >
                  <span className="count-number">{count}</span>
                  <span className="count-text">Pemain</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Selection */}
          <div className="form-group">
            <label className="section-label">Pilih Tema Petualangan</label>
            <div className="theme-selector-grid">
              {themes.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-compact-btn ${selectedTheme === t.id ? 'active' : 'inactive'}`}
                  onClick={() => handleThemeSelect(t.id)}
                >
                  <span className="theme-btn-icon">{t.icon}</span>
                  <span className="theme-btn-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Player Names & Character selection */}
          <div className="form-group">
            <label className="section-label">Nama & Karakter Penjelajah</label>
            <div className="player-names-list">
              {Array.from({ length: numPlayers }).map((_, index) => {
                const playerIndex = index + 1;
                const nameKey = `player${playerIndex}`;
                const activeCharId = playerCharacters[nameKey];
                const activeCharTemplate = characterTemplates.find(c => c.id === activeCharId);

                return (
                  <div 
                    key={playerIndex} 
                    className="player-setup-row" 
                    style={{ borderLeft: `5px solid ${activeCharTemplate?.color}` }}
                  >
                    <div className="player-name-input-wrapper">
                      <div className="input-field-container">
                        <label htmlFor={nameKey}>Nama Pemain {playerIndex}</label>
                        <input
                          type="text"
                          id={nameKey}
                          value={playerNames[nameKey]}
                          maxLength={15}
                          onChange={(e) => handleNameChange(nameKey, e.target.value)}
                          required
                          className="name-input"
                          placeholder={`Nama pemain ${playerIndex}`}
                        />
                      </div>
                    </div>

                    <div className="character-select-subgroup">
                      <span className="character-sublabel">Pilih Pion:</span>
                      <div className="character-avatar-options">
                        {characterTemplates.map(char => (
                          <button
                            key={char.id}
                            type="button"
                            className={`char-avatar-btn ${activeCharId === char.id ? 'selected' : ''}`}
                            style={{ 
                              '--char-color': char.color,
                              boxShadow: activeCharId === char.id ? `0 0 10px ${char.color}` : 'none'
                            }}
                            onClick={() => handleCharacterChange(nameKey, char.id)}
                            title={char.label}
                          >
                            <img src={char.file} alt={char.name} className="char-avatar-img" />
                          </button>
                        ))}
                      </div>
                      <span className="char-name-indicator" style={{ color: activeCharTemplate?.color }}>
                        {activeCharTemplate?.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button type="submit" className="start-btn">
            Mulai Petualangan 🚀
          </button>
        </form>
      </div>
    </div>
  );
}
