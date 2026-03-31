import { RotateCcw, Save, Trash2, X } from 'lucide-react';

import { FormActions } from '@app/components/form/FormActions';
import { FormButton } from '@app/components/form/FormButton';
import { FormTooltip } from '@app/components/form/FormTooltip';

import styles from './FactionEditor.module.css';
import { FactionLoadPopover } from './FactionLoadPopover';
import { FactionGroupPopover } from './FactionGroupPopover';
import type { Faction } from '@db/factions';

export interface FactionEditorToolbarProps {
  mode: 'create' | 'edit';
  isSaving: boolean;
  currentValues: Faction;
  currentGroupId: string | null;
  canAssignGroup: boolean;
  canDelete: boolean;
  onSave: () => void;
  onReset: () => void;
  onClose: () => void;
  onDelete?: () => Promise<void>;
  onChangeGroup?: (groupId: string | null) => Promise<void>;
}

export function FactionEditorToolbar({
  mode,
  isSaving,
  currentValues,
  currentGroupId,
  canAssignGroup,
  canDelete,
  onSave,
  onReset,
  onClose,
  onDelete,
  onChangeGroup,
}: FactionEditorToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <FormActions>
        <FormTooltip content="Save changes">
          <FormButton
            type="button"
            iconOnly
            aria-label="Save changes"
            disabled={isSaving}
            onClick={onSave}
          >
            <Save size={16} aria-hidden />
          </FormButton>
        </FormTooltip>
        <FactionLoadPopover
          disabled={isSaving}
          currentValues={currentValues}
          onLoaded={() => {
            // Page will handle reloading the editor via props/remount if desired.
            // For now this is a no-op placeholder; routes can wire a callback later if needed.
          }}
        />
        {canAssignGroup && onChangeGroup && (
          <FactionGroupPopover
            disabled={isSaving}
            currentGroupId={currentGroupId}
            canAssignGroup={canAssignGroup}
            onChangeGroup={onChangeGroup}
          />
        )}
        <FormTooltip content="Reset unsaved edits">
          <FormButton
            type="button"
            variant="danger"
            iconOnly
            aria-label="Reset unsaved edits"
            disabled={isSaving}
            onClick={onReset}
          >
            <RotateCcw size={16} aria-hidden />
          </FormButton>
        </FormTooltip>
        <FormTooltip content="Close editor">
          <FormButton
            type="button"
            variant="danger"
            iconOnly
            aria-label="Close editor"
            disabled={isSaving}
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </FormButton>
        </FormTooltip>
        {mode === 'edit' && canDelete && onDelete && (
          <FormTooltip content="Delete faction">
            <FormButton
              type="button"
              variant="danger"
              iconOnly
              aria-label="Delete faction"
              disabled={isSaving}
              onClick={() => {
                if (!window.confirm('Delete this faction? It will be hidden from lists.')) return;
                void onDelete();
              }}
            >
              <Trash2 size={16} aria-hidden />
            </FormButton>
          </FormTooltip>
        )}
      </FormActions>
      {currentGroupId != null && (
        <div className={styles.toolbarGroupAccess}>
          <span className={styles.groupStatusLabel}>Group access:</span>{' '}
          <span>{currentGroupId}</span>
        </div>
      )}
    </div>
  );
}

