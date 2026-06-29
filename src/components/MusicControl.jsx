import React, { useState, useEffect } from 'react';
import audioSystem from '../utils/audioSystem';

export default function MusicControl({ isGameStarted, theme }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(50); // Default at 50%

  useEffect(() => {
    if (isGameStarted) {
      // Sync initial theme
      audioSystem.changeTheme(theme || 'terang');
      setIsPlaying(true);
      setIsMuted(audioSystem.muted);
      setVolume(Math.round(audioSystem.volume * 100));
    }
  }, [isGameStarted, theme]);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioSystem.stopMusic();
      setIsPlaying(false);
    } else {
      audioSystem.playMusic();
      setIsPlaying(true);
    }
  };

  const handleMuteUnmute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioSystem.setMute(newMuted);
    // If we unmute and music is marked playing, make sure it is playing
    if (!newMuted && isPlaying) {
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value);
    setVolume(val);
    audioSystem.setVolume(val / 100);
    
    // Auto unmute if volume slider is moved up when muted, or auto-mute if set to 0
    if (val > 0 && isMuted) {
      audioSystem.setMute(false);
      setIsMuted(false);
    } else if (val === 0 && !isMuted) {
      audioSystem.setMute(true);
      setIsMuted(true);
    }
  };

  return (
    <div className="music-control-container">
      <div className="music-control-buttons-row">
        {/* Play/Pause Button */}
        <button 
          onClick={handlePlayPause} 
          className={`music-btn play-pause-btn ${isPlaying ? 'active' : ''}`}
          type="button"
          title={isPlaying ? 'Pause Musik' : 'Play Musik'}
        >
          <span className="btn-icon">{isPlaying ? '⏸️' : '▶️'}</span>
          <span className="btn-label">{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        {/* Mute/Unmute Button */}
        <button 
          onClick={handleMuteUnmute} 
          className={`music-btn mute-unmute-btn ${isMuted ? 'muted' : 'active'}`}
          type="button"
          title={isMuted ? 'Unmute Suara' : 'Mute Suara'}
        >
          <span className="btn-icon">{isMuted ? '🔇' : '🔊'}</span>
          <span className="btn-label">{isMuted ? 'Muted' : 'Unmuted'}</span>
        </button>
      </div>

      {/* Volume range slider */}
      <div className="volume-control-slider-wrapper">
        <span className="volume-slider-label">Volume Musik</span>
        <div className="volume-input-row">
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={handleVolumeChange} 
            className="volume-range-slider"
          />
          <span className="volume-pct-display">{volume}%</span>
        </div>
      </div>
    </div>
  );
}
