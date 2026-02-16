'use client';

import { useMemo } from 'react';
import { toCamelKey } from '@/lib/report-engine';

const MAX_EXPRESSIONS = 3;
const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'contains'];
const CONNECTORS = ['AND', 'OR'];

export default function StepExpressions({ wizardData, onChange, tableData }) {
  const attributes = wizardData.selectedInitiative?.attributes || [];
  const expressions = wizardData.expressions || [];

  // Build example values for each attribute (used as placeholder hints)
  const exampleValues = useMemo(() => {
    const examples = {};
    attributes.forEach(attr => {
      const key = toCamelKey(attr);
      const values = (tableData || [])
        .map(row => {
          const rowKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
          return rowKey ? row[rowKey] : null;
        })
        .filter(v => v !== null && v !== undefined);
      const unique = [...new Set(values.map(String))];
      examples[attr] = unique.slice(0, 3).join(', ');
    });
    return examples;
  }, [attributes, tableData]);

  function addExpression() {
    if (expressions.length >= MAX_EXPRESSIONS) return;
    const newExpr = {
      attribute: attributes[0] || '',
      operator: '=',
      value: '',
      ...(expressions.length > 0 ? { connector: 'AND' } : {}),
    };
    onChange({ expressions: [...expressions, newExpr] });
  }

  function removeExpression(index) {
    const updated = expressions.filter((_, i) => i !== index);
    // First expression should never have a connector
    if (updated.length > 0 && updated[0].connector) {
      updated[0] = { ...updated[0] };
      delete updated[0].connector;
    }
    onChange({ expressions: updated });
  }

  function updateExpression(index, field, value) {
    const updated = [...expressions];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ expressions: updated });
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '0.5rem' }}>
        Step 3: Boolean Expressions
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Define conditions to further filter the data. Up to {MAX_EXPRESSIONS} expressions, connected with AND/OR. This step is optional.
      </p>

      <div className="asrs-card">
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '0.75rem',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
            Expressions ({expressions.length}/{MAX_EXPRESSIONS})
          </h3>
          <button
            onClick={addExpression}
            disabled={expressions.length >= MAX_EXPRESSIONS}
            className="asrs-btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
          >
            + Add Expression
          </button>
        </div>

        {expressions.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
            No expressions defined. Click &quot;Add Expression&quot; to create a condition.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {expressions.map((expr, index) => (
              <div key={index} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem', backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: '6px', flexWrap: 'wrap',
              }}>
                {/* Row number */}
                <span style={{
                  fontSize: '0.75rem', fontWeight: '600',
                  color: 'var(--color-text-light)', minWidth: '20px',
                }}>
                  {index + 1}.
                </span>

                {/* Connector (AND/OR) — only for 2nd+ expressions */}
                {index > 0 ? (
                  <select
                    value={expr.connector || 'AND'}
                    onChange={(e) => updateExpression(index, 'connector', e.target.value)}
                    style={{
                      padding: '0.35rem', borderRadius: '4px',
                      border: '1px solid var(--color-bg-tertiary)', fontSize: '0.8rem',
                      width: '65px', fontWeight: '600',
                      color: 'var(--color-asrs-orange)',
                    }}
                  >
                    {CONNECTORS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{
                    width: '65px', fontSize: '0.75rem',
                    color: 'var(--color-text-light)', textAlign: 'center',
                  }}>
                    WHERE
                  </span>
                )}

                {/* Attribute dropdown */}
                <select
                  value={expr.attribute}
                  onChange={(e) => updateExpression(index, 'attribute', e.target.value)}
                  style={{
                    flex: 1, minWidth: '120px', padding: '0.35rem', borderRadius: '4px',
                    border: '1px solid var(--color-bg-tertiary)', fontSize: '0.8rem',
                  }}
                >
                  {attributes.map(attr => (
                    <option key={attr} value={attr}>{attr}</option>
                  ))}
                </select>

                {/* Operator dropdown */}
                <select
                  value={expr.operator}
                  onChange={(e) => updateExpression(index, 'operator', e.target.value)}
                  style={{
                    padding: '0.35rem', borderRadius: '4px',
                    border: '1px solid var(--color-bg-tertiary)', fontSize: '0.8rem',
                    width: '80px',
                  }}
                >
                  {OPERATORS.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>

                {/* Value input */}
                <input
                  type="text"
                  value={expr.value}
                  onChange={(e) => updateExpression(index, 'value', e.target.value)}
                  placeholder={exampleValues[expr.attribute] ? `e.g. ${exampleValues[expr.attribute]}` : 'Value'}
                  style={{
                    flex: 1, minWidth: '100px', padding: '0.35rem 0.5rem',
                    borderRadius: '4px', border: '1px solid var(--color-bg-tertiary)',
                    fontSize: '0.8rem',
                  }}
                />

                {/* Remove button */}
                <button
                  onClick={() => removeExpression(index)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-asrs-red)', fontSize: '1.1rem',
                    padding: '0 0.25rem',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {expressions.length >= MAX_EXPRESSIONS && (
          <p style={{
            fontSize: '0.75rem', color: 'var(--color-asrs-red)',
            marginTop: '0.5rem', fontStyle: 'italic',
          }}>
            Maximum of {MAX_EXPRESSIONS} expressions reached.
          </p>
        )}
      </div>
    </div>
  );
}
