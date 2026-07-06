import { useCallback, useEffect, useRef, useState } from 'react';
import type { SakaMachine } from '../domain/schemas';
import type { ControlledQemuBindingKey, QemuArgItem } from '../types/electron';

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ControlledBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
    <circle cx="12" cy="12" r="4" />
  </svg>
);

interface QemuArgsListProps {
  machine: SakaMachine;
  onChange: (next: SakaMachine) => void;
  t: (key: string) => string;
}

function getBindingDisplayName(key: string | undefined, t: (key: string) => string): string {
  if (!key) return '';
  switch (key) {
    case 'system.memory_mib':
      return t('builder.labels.memory');
    case 'system.cpu_cores':
      return t('builder.labels.cpuCores');
    case 'system.accelerator':
      return t('builder.labels.accelerator');
    case 'system.boot_order':
      return t('builder.labels.bootOrder');
    case 'network.mode':
      return t('builder.labels.networkMode');
    case 'network.card':
      return t('builder.labels.networkCard');
    default:
      return '';
  }
}

export function QemuArgsList({ machine, onChange, t }: QemuArgsListProps) {
  const [args, setArgs] = useState<QemuArgItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const NEW_CUSTOM_ID = '__new_custom_arg__';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const runtime = window.electronAPI.runtime;
      if (!runtime.buildQemuArgList) return;
      const result = await runtime.buildQemuArgList(machine);
      if (!cancelled) {
        setArgs(result.args || []);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [machine]);

  const commitCustomItems = useCallback(
    async (customArgs: string[]) => {
      const runtime = window.electronAPI.runtime;
      if (!runtime.normalizeCustomQemuArgs) return;
      const result = await runtime.normalizeCustomQemuArgs({
        machine,
        customArgs
      });
      onChange(result.machine);
      setArgs(result.args || []);
    },
    [machine, onChange]
  );

  const handleStartEdit = useCallback((item: QemuArgItem) => {
    setEditingId(item.id);
    setEditValue(item.raw);
    setEditError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
    setEditError(null);
  }, []);

  const handleCommitControlled = useCallback(
    async (item: QemuArgItem) => {
      if (!item.bindingKey) {
        handleCancelEdit();
        return;
      }
      const runtime = window.electronAPI.runtime;
      if (!runtime.applyControlledQemuArgEdit) {
        handleCancelEdit();
        return;
      }
      const result = await runtime.applyControlledQemuArgEdit({
        machine,
        bindingKey: item.bindingKey as ControlledQemuBindingKey,
        raw: editValue
      });
      if (!result.ok || !result.machine) {
        setEditError(t('builder.errors.invalidArgValue'));
        return;
      }
      onChange(result.machine);
      setArgs(result.args || []);
      setEditingId(null);
      setEditValue('');
      setEditError(null);
    },
    [editValue, machine, onChange, handleCancelEdit, t]
  );

  const handleCommitCustom = useCallback(
    async (item: QemuArgItem) => {
      const trimmed = editValue.trim();
      if (trimmed.length === 0) {
        handleCancelEdit();
        return;
      }
      const currentCustom = args.filter((arg) => arg.source === 'custom').map((arg) => arg.raw);
      const nextCustom =
        item.id === NEW_CUSTOM_ID
          ? [...currentCustom, trimmed]
          : currentCustom.map((raw, index) => {
              const customItems = args.filter((arg) => arg.source === 'custom');
              return customItems[index]?.id === item.id ? trimmed : raw;
            });
      await commitCustomItems(nextCustom);
      setEditingId(null);
      setEditValue('');
      setEditError(null);
    },
    [args, commitCustomItems, editValue, handleCancelEdit]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, item: QemuArgItem) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (item.source === 'controlled') {
          handleCommitControlled(item);
        } else {
          handleCommitCustom(item);
        }
      } else if (event.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleCommitControlled, handleCommitCustom, handleCancelEdit]
  );

  const handleAddCustom = useCallback(() => {
    setEditingId(NEW_CUSTOM_ID);
    setEditValue('');
    setEditError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleRemove = useCallback(
    async (item: QemuArgItem) => {
      if (item.source === 'controlled') return;
      const nextCustom = args.filter((arg) => arg.source === 'custom' && arg.id !== item.id).map((arg) => arg.raw);
      await commitCustomItems(nextCustom);
      if (editingId === item.id) {
        setEditingId(null);
        setEditValue('');
        setEditError(null);
      }
    },
    [args, commitCustomItems, editingId]
  );

  return (
    <div className="qemu-args-list">
      <div className="qemu-args-list__header">
        <span className="qemu-args-list__title">{t('builder.labels.advancedArgs')}</span>
        <button
          className="qemu-args-list__add-btn"
          type="button"
          onClick={handleAddCustom}
          title={t('builder.actions.addArg')}
          aria-label={t('builder.actions.addArg')}
        >
          <PlusIcon />
          <span>{t('builder.actions.add')}</span>
        </button>
      </div>
      <div className="qemu-args-list__rows" role="list">
        {args.map((item) => {
          const isEditing = editingId === item.id;
          return (
            <div
              key={item.id}
              className={`qemu-args-list__row qemu-args-list__row--${item.source}`}
              role="listitem"
              onDoubleClick={() => item.editable && !isEditing && handleStartEdit(item)}
            >
              <span className="qemu-args-list__badge" aria-hidden="true">
                {item.source === 'controlled' ? <ControlledBadgeIcon /> : null}
              </span>
              {item.source === 'controlled' && (
                <span className="qemu-args-list__binding">{getBindingDisplayName(item.bindingKey, t)}</span>
              )}
              {isEditing ? (
                <input
                  ref={inputRef}
                  className="qemu-args-list__input"
                  type="text"
                  value={editValue}
                  aria-label={t('builder.labels.advancedArgs')}
                  placeholder={item.source === 'controlled' ? '-m 2048' : '-global ICH9-LPC.disable_s3=1'}
                  onChange={(event) => setEditValue(event.target.value)}
                  onBlur={() => {
                    if (item.source === 'controlled') {
                      handleCommitControlled(item);
                    } else {
                      handleCommitCustom(item);
                    }
                  }}
                  onKeyDown={(event) => handleKeyDown(event, item)}
                />
              ) : (
                <code
                  className="qemu-args-list__raw"
                  onClick={() => item.editable && handleStartEdit(item)}
                  role="button"
                  tabIndex={item.editable ? 0 : -1}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && item.editable) {
                      event.preventDefault();
                      handleStartEdit(item);
                    }
                  }}
                >
                  {item.raw}
                </code>
              )}
              {item.source === 'custom' && (
                <button
                  className="qemu-args-list__remove-btn"
                  type="button"
                  onClick={() => handleRemove(item)}
                  title={t('builder.actions.removeArg')}
                  aria-label={t('builder.actions.removeArg')}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          );
        })}
        {editingId === NEW_CUSTOM_ID && (
          <div className="qemu-args-list__row qemu-args-list__row--custom" role="listitem">
            <span className="qemu-args-list__badge" aria-hidden="true" />
            <input
              ref={inputRef}
              className="qemu-args-list__input"
              type="text"
              value={editValue}
              aria-label={t('builder.labels.advancedArgs')}
              placeholder="-global ICH9-LPC.disable_s3=1"
              onChange={(event) => setEditValue(event.target.value)}
              onBlur={() => void handleCommitCustom({ id: NEW_CUSTOM_ID, raw: '', source: 'custom', editable: true })}
              onKeyDown={(event) => void handleKeyDown(event, { id: NEW_CUSTOM_ID, raw: '', source: 'custom', editable: true })}
            />
          </div>
        )}
      </div>
      {editError && <div className="qemu-args-list__error">{editError}</div>}
    </div>
  );
}
