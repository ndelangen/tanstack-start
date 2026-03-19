import clsx from 'clsx';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { FormField } from '@app/components/form';

import styles from './FactionEditor.module.css';

interface AssetAutocompleteProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
  id?: string;
  placeholder?: string;
}

type ListGeom = { top: number; left: number; width: number };

type Partition = {
  /** Substring matches, best matches first */
  included: string[];
  /** Non-matches, A–Z */
  excluded: string[];
  /** included then excluded — keyboard order */
  flat: string[];
};

/** Higher = better match; `null` = does not contain query */
function relevanceScore(option: string, qLower: string): number | null {
  if (qLower.length === 0) return 0;
  const o = option.toLowerCase();
  if (!o.includes(qLower)) return null;
  if (o === qLower) return 4_000_000;
  if (o.startsWith(qLower)) return 3_000_000 + Math.max(0, 10_000 - o.length);
  const idx = o.indexOf(qLower);
  return 2_000_000 + Math.max(0, 10_000 - idx);
}

function partitionOptions(options: readonly string[], rawQuery: string): Partition {
  const q = rawQuery.trim().toLowerCase();
  const unique = [...new Set(options)].sort((a, b) => a.localeCompare(b));

  if (q.length === 0) {
    return { included: unique, excluded: [], flat: unique };
  }

  const rows = unique.map((opt) => ({
    opt,
    score: relevanceScore(opt, q),
  }));

  const included = rows
    .filter((r): r is { opt: string; score: number } => r.score != null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.opt.localeCompare(b.opt);
    })
    .map((r) => r.opt);

  const excluded = rows
    .filter((r) => r.score == null)
    .map((r) => r.opt)
    .sort((a, b) => a.localeCompare(b));

  return { included, excluded, flat: [...included, ...excluded] };
}

export function AssetAutocomplete({
  label,
  value,
  onChange,
  options,
  id: idProp,
  placeholder = 'Type to search…',
}: AssetAutocompleteProps) {
  const reactId = useId();
  const id = idProp ?? `asset-ac-${reactId}`;
  const listId = `${id}-listbox`;

  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const [highlight, setHighlight] = useState(0);
  const [listGeom, setListGeom] = useState<ListGeom | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  const partition = useMemo(() => partitionOptions(options, text), [options, text]);

  useEffect(() => {
    if (highlight >= partition.flat.length) {
      setHighlight(Math.max(0, partition.flat.length - 1));
    }
  }, [partition.flat.length, highlight]);

  const updateListPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    /* Ceil avoids subpixel overlap where the list can paint a row sliver under the input. */
    setListGeom({ top: Math.ceil(r.bottom) + gap, left: r.left, width: r.width });
  }, []);

  useLayoutEffect(() => {
    if (!open || options.length === 0) {
      setListGeom(null);
      return;
    }
    updateListPosition();
    const el = inputRef.current;
    const ro =
      typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(updateListPosition) : null;
    ro?.observe(el as Element);
    window.addEventListener('resize', updateListPosition);
    window.addEventListener('scroll', updateListPosition, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateListPosition);
      window.removeEventListener('scroll', updateListPosition, true);
    };
  }, [open, options.length, updateListPosition]);

  const showList = open && options.length > 0 && listGeom != null;

  useLayoutEffect(() => {
    if (!showList) return;
    const p = portalRef.current;
    if (!p) return;
    const preventBlur = (e: Event) => e.preventDefault();
    p.addEventListener('mousedown', preventBlur);
    return () => p.removeEventListener('mousedown', preventBlur);
  }, [showList]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (portalRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const commit = useCallback(
    (next: string) => {
      onChange(next);
      setText(next);
      setOpen(false);
    },
    [onChange]
  );

  const tryCommitText = useCallback(() => {
    const t = text.trim();
    const exact = options.find((o) => o === t);
    if (exact) {
      commit(exact);
      return;
    }
    const lower = t.toLowerCase();
    const one = options.filter((o) => o.toLowerCase() === lower);
    if (one.length === 1) commit(one[0]);
    else setText(value);
  }, [commit, options, text, value]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setText(value);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, partition.flat.length - 1)));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    }
    if (e.key === 'Enter' && open && partition.flat[highlight]) {
      e.preventDefault();
      commit(partition.flat[highlight]);
    }
  };

  const hasFilter = text.trim().length > 0;
  const includedLabel = hasFilter ? 'Likely matches' : 'All options';
  const excludedLabel = 'Other paths';
  const noMatchesOnly =
    hasFilter && partition.included.length === 0 && partition.excluded.length > 0;

  const portal =
    typeof document !== 'undefined' &&
    showList &&
    listGeom &&
    createPortal(
      <div
        ref={portalRef}
        id={listId}
        className={styles.comboboxListPortal}
        style={{
          top: listGeom.top,
          left: listGeom.left,
          width: listGeom.width,
        }}
      >
        {noMatchesOnly ? (
          <div className={styles.comboboxSection}>
            <div className={styles.comboboxSectionLabel}>No substring match — all paths (A–Z)</div>
            {partition.excluded.map((opt, j) => {
              const i = j;
              return (
                <button
                  key={opt}
                  id={`${id}-opt-${i}`}
                  type="button"
                  className={i === highlight ? styles.comboboxOptionActive : styles.comboboxOption}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => commit(opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className={styles.comboboxSection}>
              <div className={styles.comboboxSectionLabel}>{includedLabel}</div>
              {partition.included.map((opt, j) => {
                const i = j;
                return (
                  <button
                    key={opt}
                    id={`${id}-opt-${i}`}
                    type="button"
                    className={
                      i === highlight ? styles.comboboxOptionActive : styles.comboboxOption
                    }
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => commit(opt)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {partition.excluded.length > 0 && (
              <div className={styles.comboboxSection}>
                <div className={styles.comboboxSectionDivider} />
                <div className={styles.comboboxSectionLabel}>{excludedLabel}</div>
                {partition.excluded.map((opt, j) => {
                  const i = partition.included.length + j;
                  return (
                    <button
                      key={opt}
                      id={`${id}-opt-${i}`}
                      type="button"
                      className={
                        i === highlight ? styles.comboboxOptionActive : styles.comboboxOption
                      }
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => commit(opt)}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>,
      document.body
    );

  return (
    <FormField label={label} htmlFor={id}>
      <div ref={wrapRef} className={clsx(styles.comboboxWrap, open && styles.comboboxWrapOpen)}>
        <input
          ref={inputRef}
          id={id}
          className={styles.comboboxInput}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            showList && partition.flat[highlight] ? `${id}-opt-${highlight}` : undefined
          }
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
            setOpen(true);
          }}
          onBlur={() => {
            tryCommitText();
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {portal}
    </FormField>
  );
}
