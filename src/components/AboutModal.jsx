import React from 'react';
import { aboutConfig } from '../data/aboutConfig';

export default function AboutModal({ isOpen, onClose, theme }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-about-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-card about-card animate-pop-in" data-theme={theme} onClick={e => e.stopPropagation()}>
        <div className="about-header">
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
          <div className="logo-container">
            <img 
              src={aboutConfig.logoPath} 
              alt="Logo Unindra" 
              className="about-logo"
            />
          </div>
        </div>

        <div className="about-body">
          <h2 className="about-title">🎮 {aboutConfig.title}</h2>
          
          <div className="about-description-section">
            {aboutConfig.description.map((paragraph, index) => (
              <p key={index} className="about-desc-para">{paragraph}</p>
            ))}
          </div>

          <div className="about-details-grid">
            {aboutConfig.academicInfo.map((info, index) => (
              <div key={index} className="about-detail-item">
                <span className="about-detail-icon">{info.icon}</span>
                <div className="about-detail-text">
                  <span className="about-detail-label">{info.label}</span>
                  <strong className="about-detail-value">{info.value}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="about-goal-box">
            <div className="about-goal-header">
              <span className="about-goal-icon">{aboutConfig.projectGoal.icon}</span>
              <h3>{aboutConfig.projectGoal.label}</h3>
            </div>
            <p className="about-goal-value">{aboutConfig.projectGoal.value}</p>
          </div>
        </div>

        <div className="about-footer">
          <button className="close-action-btn" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}
