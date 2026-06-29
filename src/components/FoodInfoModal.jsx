import React from 'react';

export default function FoodInfoModal({ food, onClose }) {
  if (!food) return null;

  // Map region to specific gradient classes
  const regionGradients = {
    Jawa: 'linear-gradient(135deg, #f5d061 0%, #e29578 100%)',
    Sulawesi: 'linear-gradient(135deg, #2a9d8f 0%, #264653 100%)',
    Kalimantan: 'linear-gradient(135deg, #76c893 0%, #1a759f 100%)',
    Sumatra: 'linear-gradient(135deg, #e76f51 0%, #a8201a 100%)',
    Papua: 'linear-gradient(135deg, #b79ced 0%, #562c2c 100%)'
  };

  const getEmoji = (name) => {
    const n = name.toLowerCase();
    if (n.includes('soto') || n.includes('sup') || n.includes('coto') || n.includes('konro') || n.includes('rawon') || n.includes('kaledo')) return '🥣';
    if (n.includes('sate') || n.includes('ulat')) return '🍢';
    if (n.includes('mie') || n.includes('bakso')) return '🍜';
    if (n.includes('nasi') || n.includes('papeda')) return '🍛';
    if (n.includes('pisang') || n.includes('lumpia') || n.includes('serabi') || n.includes('bingka') || n.includes('lempeng') || n.includes('lontar') || n.includes('choi') || n.includes('hekeng') || n.includes('mandai')) return '🍰';
    if (n.includes('ikan') || n.includes('pempek') || n.includes('laksan') || n.includes('otak') || n.includes('udang')) return '🐟';
    return '🍽️';
  };

  const gradient = regionGradients[food.region] || 'linear-gradient(135deg, #ddd 0%, #999 100%)';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card food-info-card" onClick={e => e.stopPropagation()}>
        <div className="food-card-header" style={{ background: gradient }}>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
          <div className="food-avatar-large">
            {getEmoji(food.name)}
          </div>
        </div>

        <div className="food-card-body">
          <div className="food-region-tag" data-region={food.region}>
            Pulau {food.region}
          </div>
          <h2 className="food-title">{food.name}</h2>
          <div className="food-origin">
            <span className="origin-icon">📍</span> Asal: <strong>{food.origin}</strong>
          </div>
          
          <div className="food-description-container">
            <h3>Deskripsi Kuliner</h3>
            <p className="food-description">{food.description}</p>
          </div>

          <div className="food-card-footer">
            <div className="box-number-indicator">Kotak {food.id}</div>
            <button className="close-action-btn" onClick={onClose}>Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}
