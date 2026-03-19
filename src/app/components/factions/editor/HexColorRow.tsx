import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

import styles from './FactionEditor.module.css';

export function normalizePickerHex(hex: string): string {
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex.toLowerCase();
  return '#000000';
}

export type HexColorRowProps = {
  pickerId: string;
  textId: string;
  value: string;
  onChange: (next: string) => void;
  pickerAriaLabel: string;
  onBlur?: () => void;
  placeholder?: string;
  /** e.g. theme color — caps width; omit for flexible width in toolbars */
  constrainedWidth?: boolean;
} & Pick<ComponentPropsWithoutRef<'div'>, 'className'>;

/**
 * Native `<input type="color">` + hex text in one bordered control (faction editor).
 */
export function HexColorRow({
  pickerId,
  textId,
  value,
  onChange,
  onBlur,
  pickerAriaLabel,
  placeholder = '#rrggbb',
  constrainedWidth = false,
  className,
}: HexColorRowProps) {
  const pickerValue = normalizePickerHex(value);

  return (
    <div
      className={clsx(
        styles.hexColorRow,
        constrainedWidth && styles.hexColorRowConstrained,
        className
      )}
    >
      <input
        id={pickerId}
        className={styles.hexColorPicker}
        type="color"
        value={pickerValue}
        onChange={(e) => onChange(normalizePickerHex(e.target.value))}
        aria-label={pickerAriaLabel}
      />
      <input
        id={textId}
        className={styles.hexColorHexInput}
        type="text"
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
