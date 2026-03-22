import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Pipette } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

import { FormPrefixedInput, FormTooltip } from '@app/components/form';
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
  className,
}: HexColorRowProps) {
  const pickerValue = normalizePickerHex(value);

  return (
    <FormPrefixedInput
      className={clsx(styles.hexColorRow, className)}
      prefix={
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              id={pickerId}
              type="button"
              className={styles.hexColorPickerWrap}
              aria-label={pickerAriaLabel}
            >
              <span
                className={styles.hexColorSwatch}
                style={{ backgroundColor: pickerValue }}
                aria-hidden
              />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className={styles.hexColorPopover}
              side="bottom"
              align="start"
              sideOffset={8}
              collisionPadding={10}
            >
              <HexColorPicker
                color={pickerValue}
                onChange={(next) => onChange(normalizePickerHex(next))}
              />
              <div className={styles.hexColorPopoverFooter}>
                <span className={styles.hexColorPopoverValue}>{pickerValue}</span>
                <FormTooltip content="Open system color picker">
                  <label className={styles.hexColorNativePickerButton}>
                    <Pipette size={14} aria-hidden />
                    <input
                      className={styles.hexColorNativePickerInput}
                      type="color"
                      value={pickerValue}
                      onChange={(e) => onChange(normalizePickerHex(e.target.value))}
                      aria-label={pickerAriaLabel}
                    />
                  </label>
                </FormTooltip>
              </div>
              <Popover.Arrow className={styles.hexColorPopoverArrow} width={10} height={6} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      }
    >
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
    </FormPrefixedInput>
  );
}
