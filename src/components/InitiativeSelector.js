/**
 * ============================================================================
 * INITIATIVE SELECTOR — Displays clickable cards for each ASRS initiative.
 * ============================================================================
 * This is the row/grid of initiative cards right below the header.
 * When a user clicks a card, the report dashboard below updates to show
 * that initiative's data.
 *
 * Props:
 * - initiatives: Array — The list of all initiatives from the JSON/API.
 * - selectedInitiative: Object|null — The currently selected initiative.
 * - onSelect: function — Called when the user clicks an initiative card.
 * ============================================================================
 */
'use client';

export default function InitiativeSelector({ initiatives, selectedInitiative, onSelect }) {
  /**
   * Short name abbreviations for the initiative cards.
   * These are displayed on small screens where the full name won't fit.
   */
  const shortNames = {
    1: 'E-Gaming',
    2: 'Robotics',
    3: 'ELA Awards',
    4: 'Bags2School',
    5: 'Track Team',
    6: 'Proposals',
    7: 'Amazon'
  };

  /**
   * Colors for each initiative card's left border accent.
   * This adds visual variety so users can quickly identify initiatives.
   */
  const accentColors = [
    '#C0392B', '#E67E22', '#F39C12', '#27AE60',
    '#2980B9', '#8E44AD', '#1ABC9C'
  ];

  return (
    <div>
      {/* Section title */}
      <h2 style={{
        fontSize: '1.1rem', fontWeight: '600',
        color: 'var(--color-text-secondary)',
        marginBottom: '0.75rem'
      }}>
        Select Initiative
      </h2>

      {/* Grid of initiative cards — wraps on smaller screens */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: '0.75rem'
      }}>
        {initiatives.map((initiative, index) => {
          // Check if this card is the currently selected one
          const isSelected = selectedInitiative?.id === initiative.id;

          return (
            <button
              key={initiative.id}
              onClick={() => onSelect(initiative)}
              style={{
                // Card base styles
                background: isSelected ? 'white' : 'var(--color-bg-secondary)',
                border: isSelected
                  ? `2px solid ${accentColors[index]}`
                  : '2px solid transparent',
                borderLeft: `4px solid ${accentColors[index]}`,
                borderRadius: '10px',
                padding: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 3px 12px rgba(0,0,0,0.1)' : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'none'
              }}
            >
              <span style={{
                fontSize: '0.85rem',
                fontWeight: isSelected ? '700' : '500',
                color: isSelected ? accentColors[index] : 'var(--color-text-primary)',
                display: 'block'
              }}>
                {/* Show the short name on the card */}
                {shortNames[initiative.id] || initiative.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}