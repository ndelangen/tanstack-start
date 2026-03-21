import { Plus, Trash2 } from 'lucide-react';

import type { Faction } from '@db/factions';
import { FormButton, FormTooltip } from '@app/components/form';

import styles from './FactionEditor.module.css';
import { HexColorRow } from './HexColorRow';

type BgColor = Faction['background']['colors'][number];

type LinearGradient = Extract<BgColor, { type: 'linear' }>;
type RadialGradient = Extract<BgColor, { type: 'radial' }>;

const defaultLinear = (): LinearGradient => ({
  type: 'linear',
  angle: 90,
  stops: [
    ['#000000', 0],
    ['#ffffff', 1],
  ],
});

const defaultRadial = (): RadialGradient => ({
  type: 'radial',
  stops: [
    ['#000000', 0],
    ['#ffffff', 1],
  ],
});

function isHex(v: BgColor): v is string {
  return typeof v === 'string';
}

interface BackgroundColorSlotProps {
  legend: string;
  value: BgColor;
  onChange: (next: BgColor) => void;
  idPrefix: string;
}

export function BackgroundColorSlot({
  legend,
  value,
  onChange,
  idPrefix,
}: BackgroundColorSlotProps) {
  const mode = isHex(value) ? 'hex' : 'gradient';

  return (
    <fieldset className={styles.colorSlotFieldset}>
      <legend className={styles.colorSlotLegend}>{legend}</legend>

      <div className={styles.colorModeRow}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name={`${idPrefix}-mode`}
            checked={mode === 'hex'}
            onChange={() => {
              if (isHex(value)) onChange(value);
              else {
                const h = value.stops[0]?.[0] ?? '';
                onChange(/^#[0-9a-f]{6}$/i.test(h) ? h : '#000000');
              }
            }}
          />
          Solid color
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name={`${idPrefix}-mode`}
            checked={mode === 'gradient'}
            onChange={() => {
              if (!isHex(value)) onChange(value);
              else {
                const h = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
                onChange({
                  ...defaultLinear(),
                  stops: [
                    [h, 0],
                    [h, 1],
                  ],
                });
              }
            }}
          />
          Gradient
        </label>
      </div>

      {mode === 'hex' && isHex(value) && (
        <HexColorRow
          pickerId={`${idPrefix}-picker`}
          textId={`${idPrefix}-hex`}
          value={value}
          onChange={(h) => onChange(h)}
          pickerAriaLabel="Pick background color"
          constrainedWidth
        />
      )}

      {mode === 'gradient' && !isHex(value) && (
        <GradientEditor idPrefix={idPrefix} value={value} onChange={onChange} />
      )}
    </fieldset>
  );
}

function GradientEditor({
  value,
  onChange,
  idPrefix,
}: {
  value: LinearGradient | RadialGradient;
  onChange: (next: BgColor) => void;
  idPrefix: string;
}) {
  const setLinear = () => {
    if (value.type === 'linear') return;
    onChange({ ...defaultLinear(), stops: [...value.stops] });
  };
  const setRadial = () => {
    if (value.type === 'radial') return;
    onChange({ ...defaultRadial(), stops: [...value.stops] });
  };

  const updateStops = (stops: [string, number][]) => {
    if (value.type === 'linear') {
      onChange({ ...value, stops });
    } else {
      onChange({ ...value, stops });
    }
  };

  const addStop = () => {
    const last = value.stops[value.stops.length - 1];
    const hex = last?.[0] ?? '#888888';
    const pos = Math.min(1, (last?.[1] ?? 1) + 0.01);
    updateStops([...value.stops, [hex, pos]]);
  };

  const removeStop = (i: number) => {
    if (value.stops.length <= 2) return;
    updateStops(value.stops.filter((_, j) => j !== i));
  };

  return (
    <div className={styles.gradientWrap}>
      <div className={styles.colorModeRow}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name={`${idPrefix}-gtype`}
            checked={value.type === 'linear'}
            onChange={setLinear}
          />
          Linear
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name={`${idPrefix}-gtype`}
            checked={value.type === 'radial'}
            onChange={setRadial}
          />
          Radial
        </label>
      </div>

      {value.type === 'linear' && (
        <label className={styles.sliderLabel}>
          Angle (0–360°)
          <span className={styles.sliderValue}>{value.angle}</span>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={value.angle}
            onChange={(e) =>
              onChange({ ...value, angle: Number.parseInt(e.target.value, 10) || 0 })
            }
          />
        </label>
      )}

      {value.type === 'radial' && (
        <div className={styles.radialGrid}>
          <label>
            x (optional)
            <input
              type="number"
              step="0.01"
              className={styles.hexText}
              value={value.x ?? ''}
              placeholder="default"
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...value,
                  x: v === '' ? undefined : Number.parseFloat(v),
                });
              }}
            />
          </label>
          <label>
            y (optional)
            <input
              type="number"
              step="0.01"
              className={styles.hexText}
              value={value.y ?? ''}
              placeholder="default"
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...value,
                  y: v === '' ? undefined : Number.parseFloat(v),
                });
              }}
            />
          </label>
          <label>
            r (optional)
            <input
              type="number"
              step="0.01"
              className={styles.hexText}
              value={value.r ?? ''}
              placeholder="default"
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...value,
                  r: v === '' ? undefined : Number.parseFloat(v),
                });
              }}
            />
          </label>
        </div>
      )}

      <p className={styles.stopsHint}>Gradient stops (color + position 0–1). At least two stops.</p>
      {value.stops.map((stop, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stop rows tracked by array index in form state
        <div key={`${idPrefix}-stop-${i}`} className={styles.stopRow}>
          <HexColorRow
            pickerId={`${idPrefix}-stop-${i}-picker`}
            textId={`${idPrefix}-stop-${i}-hex`}
            value={stop[0]}
            onChange={(h) => {
              const next = [...value.stops] as [string, number][];
              next[i] = [h, stop[1]];
              updateStops(next);
            }}
            pickerAriaLabel={`Stop ${i + 1} color`}
          />
          <label className={styles.sliderLabel}>
            <span className={styles.sliderValue}>{stop[1].toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={stop[1]}
              onChange={(e) => {
                const next = [...value.stops] as [string, number][];
                next[i] = [stop[0], Number.parseFloat(e.target.value) || 0];
                updateStops(next);
              }}
            />
          </label>
          <FormTooltip content={`Remove stop ${i + 1}`}>
            <FormButton
              type="button"
              variant="danger"
              iconOnly
              aria-label={`Remove stop ${i + 1}`}
              disabled={value.stops.length <= 2}
              onClick={() => removeStop(i)}
            >
              <Trash2 size={16} aria-hidden />
            </FormButton>
          </FormTooltip>
        </div>
      ))}
      <FormTooltip content="Add gradient stop">
        <FormButton
          type="button"
          variant="secondary"
          iconOnly
          aria-label="Add gradient stop"
          onClick={addStop}
        >
          <Plus size={16} aria-hidden />
        </FormButton>
      </FormTooltip>
    </div>
  );
}
