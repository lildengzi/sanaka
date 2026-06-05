import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Checkbox } from './Checkbox';
import { useT } from '../hooks/useT';
import type { DiskInterface } from '../domain/schemas';

// 镜像格式选项
const imageFormats = [
  { value: 'qcow2', label: 'QCOW2 (QEMU)' },
  { value: 'qed', label: 'QED (QEMU Enhanced)' },
  { value: 'qcow', label: 'QCOW (Legacy)' },
  { value: 'vmdk', label: 'VMDK (VMware)' },
  { value: 'vpc', label: 'VHD (Virtual PC)' },
  { value: 'vdi', label: 'VDI (VirtualBox)' },
  { value: 'raw', label: 'IMG (Raw)' }
] as const;

type ImageFormat = typeof imageFormats[number]['value'];
type CapacityUnit = 'MB' | 'GB';
type TabType = 'import' | 'create' | 'manage';

interface DiskImageInfo {
  id: string;
  path: string;
  name: string;
  format: ImageFormat;
  virtualSize: number;
  actualSize: number;
  unit: CapacityUnit;
}

type DiskStorageMode = 'managed' | 'external';

interface MachineDiskDraft {
  id: string;
  path: string;
  format?: ImageFormat;
  interface: DiskInterface;
  boot: boolean;
  readonly: boolean;
  storage_mode?: DiskStorageMode;
  source_path?: string;
  pending_create?: {
    size: number;
    unit: CapacityUnit;
  };
}

interface DiskImageManagerProps {
  isOpen: boolean;
  onClose: () => void;
  existingDisks: MachineDiskDraft[];
  onDisksChange: (disks: MachineDiskDraft[]) => void;
  defaultInterface: DiskInterface;
}

// Custom Select Component
interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" width="12" height="12">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function CustomSelect({ value, options, onChange, placeholder = '请选择' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  const dropdown = isOpen ? (
    <div
      className="disk-image-manager__select-dropdown"
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 9999
      }}
    >
      {options.map((option) => (
        <div
          key={option.value}
          className={`disk-image-manager__select-option ${option.value === value ? 'disk-image-manager__select-option--selected' : ''}`}
          onClick={() => {
            onChange(option.value);
            setIsOpen(false);
          }}
        >
          <span className="disk-image-manager__checkmark">
            {option.value === value && <CheckIcon />}
          </span>
          <span>{option.label}</span>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className="disk-image-manager__select" ref={containerRef}>
      <div
        ref={triggerRef}
        className={`disk-image-manager__select-trigger ${isOpen ? 'disk-image-manager__select-trigger--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <span className="disk-image-manager__select-arrow">
          <ChevronDownIcon />
        </span>
      </div>
      {dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}

// Icons
const ImportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const CreateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const ManageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const DiskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const ExpandIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="16"
    height="16"
    style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ResizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const ConvertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const CleanupIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export function DiskImageManager({ isOpen, onClose, existingDisks, onDisksChange, defaultInterface }: DiskImageManagerProps) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<TabType>('import');
  const [importedImages, setImportedImages] = useState<DiskImageInfo[]>([]);
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Create new image state
  const [newImageName, setNewImageName] = useState('');
  const [newImageSize, setNewImageSize] = useState<number>(20);
  const [newImageUnit, setNewImageUnit] = useState<CapacityUnit>('GB');
  const [newImageFormat, setNewImageFormat] = useState<ImageFormat>('qcow2');

  // Advanced options state
  const [compression, setCompression] = useState(false);
  const [sparse, setSparse] = useState(false);
  const [preallocate, setPreallocate] = useState(false);

  // Handle animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleImportImage = useCallback(async () => {
    const picked = await window.electronAPI.dialogs.pickDisk();
    if (!picked?.path) return;

    const ext = picked.path.split('.').pop()?.toLowerCase() || 'raw';
    const formatMap: Record<string, ImageFormat> = {
      'qcow2': 'qcow2',
      'qed': 'qed',
      'qcow': 'qcow',
      'vmdk': 'vmdk',
      'vhd': 'vpc',
      'vpc': 'vpc',
      'vdi': 'vdi',
      'img': 'raw',
      'raw': 'raw'
    };
    const detectedFormat = formatMap[ext] || 'raw';

    const newImage: DiskImageInfo = {
      id: `disk-${Date.now()}`,
      path: picked.path,
      name: picked.path.split(/[/\\]/).pop() || 'unnamed',
      format: detectedFormat,
      virtualSize: 0,
      actualSize: 0,
      unit: 'GB'
    };

    setImportedImages(prev => [...prev, newImage]);

    const newDisk = {
      id: newImage.id,
      path: picked.path,
      format: detectedFormat,
      interface: defaultInterface,
      boot: existingDisks.length === 0,
      readonly: false,
      storage_mode: 'external' as const,
      source_path: ''
    };
    onDisksChange([...existingDisks, newDisk]);
  }, [existingDisks, onDisksChange, defaultInterface]);

  const handleCreateImage = useCallback(async () => {
    const normalizedName = newImageName.trim();
    if (!normalizedName) return;
    const fileExtension = newImageFormat === 'raw' ? 'img' : newImageFormat;
    const relativePath = `Disks/${normalizedName}.${fileExtension}`;
    const newImage: DiskImageInfo = {
      id: `disk-${Date.now()}`,
      path: relativePath,
      name: normalizedName,
      format: newImageFormat,
      virtualSize: newImageSize,
      actualSize: 0,
      unit: newImageUnit
    };

    setImportedImages(prev => [...prev, newImage]);

    const newDisk = {
      id: newImage.id,
      path: relativePath,
      format: newImageFormat,
      interface: defaultInterface,
      boot: existingDisks.length === 0,
      readonly: false,
      storage_mode: 'managed' as const,
      source_path: '',
      pending_create: {
        size: newImageSize,
        unit: newImageUnit
      }
    };
    onDisksChange([...existingDisks, newDisk]);

    setNewImageName('');
    setNewImageSize(20);
  }, [newImageName, newImageSize, newImageUnit, newImageFormat, existingDisks, onDisksChange, defaultInterface]);

  const handleRemoveImage = useCallback((imageId: string) => {
    setImportedImages(prev => prev.filter(img => img.id !== imageId));
    onDisksChange(existingDisks.filter(disk => disk.id !== imageId));
  }, [existingDisks, onDisksChange]);

  const toggleExpand = useCallback((imageId: string) => {
    setExpandedImageId(prev => prev === imageId ? null : imageId);
  }, []);

  const formatFileSize = (size: number, unit: CapacityUnit): string => {
    return `${size} ${unit}`;
  };

  const unitOptions: SelectOption[] = [
    { value: 'MB', label: 'MB' },
    { value: 'GB', label: 'GB' }
  ];

  const formatOptions: SelectOption[] = imageFormats.map(fmt => ({
    value: fmt.value,
    label: fmt.label
  }));

  if (!isVisible) return null;

  return (
    <div className={`disk-image-manager-overlay ${isOpen ? 'disk-image-manager-overlay--open' : ''}`} onClick={onClose}>
      <div className="disk-image-manager" onClick={e => e.stopPropagation()}>
        <div className="disk-image-manager__header">
          <h2>{t('diskManager.title')}</h2>
          <button className="button button--ghost" onClick={onClose} type="button">
            {t('app.close')}
          </button>
        </div>

        <div className="disk-image-manager__tabs">
          <button
            className={`disk-image-manager__tab ${activeTab === 'import' ? 'disk-image-manager__tab--active' : ''}`}
            onClick={() => setActiveTab('import')}
            type="button"
          >
            <ImportIcon />
            <span>{t('diskManager.tabs.import')}</span>
          </button>
          <button
            className={`disk-image-manager__tab ${activeTab === 'create' ? 'disk-image-manager__tab--active' : ''}`}
            onClick={() => setActiveTab('create')}
            type="button"
          >
            <CreateIcon />
            <span>{t('diskManager.tabs.create')}</span>
          </button>
          <button
            className={`disk-image-manager__tab ${activeTab === 'manage' ? 'disk-image-manager__tab--active' : ''}`}
            onClick={() => setActiveTab('manage')}
            type="button"
          >
            <ManageIcon />
            <span>{t('diskManager.tabs.manage')}</span>
          </button>
        </div>

        <div className="disk-image-manager__content">
          {activeTab === 'import' && (
            <div className="disk-image-manager__section disk-image-manager__tab-panel" key="import">
              <div className="disk-image-manager__intro">
                <h3>{t('diskManager.import.title')}</h3>
                <p>{t('diskManager.import.description')}</p>
              </div>

              <div className="disk-image-manager__formats">
                <span className="disk-image-manager__label">{t('diskManager.formats.supported')}</span>
                <div className="disk-image-manager__format-tags">
                  {imageFormats.map(fmt => (
                    <span key={fmt.value} className="format-tag">{fmt.label}</span>
                  ))}
                </div>
              </div>

              <button
                className="button button--primary disk-image-manager__action-btn"
                onClick={handleImportImage}
                type="button"
              >
                <ImportIcon />
                {t('diskManager.import.button')}
              </button>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="disk-image-manager__section disk-image-manager__tab-panel" key="create">
              <div className="disk-image-manager__intro">
                <h3>{t('diskManager.create.title')}</h3>
                <p>{t('diskManager.create.description')}</p>
              </div>

              <div className="disk-image-manager__form">
                <div className="disk-image-manager__field">
                  <label>{t('diskManager.create.nameLabel')}</label>
                  <input
                    type="text"
                    value={newImageName}
                    onChange={(e) => setNewImageName(e.target.value)}
                    placeholder={t('diskManager.create.namePlaceholder')}
                  />
                </div>

                <div className="disk-image-manager__field-row">
                  <div className="disk-image-manager__field">
                    <label>{t('diskManager.create.sizeLabel')}</label>
                    <div className="disk-image-manager__size-input">
                      <input
                        type="number"
                        min={1}
                        value={newImageSize}
                        onChange={(e) => setNewImageSize(Math.max(1, Number(e.target.value)))}
                      />
                      <CustomSelect
                        value={newImageUnit}
                        options={unitOptions}
                        onChange={(value) => setNewImageUnit(value as CapacityUnit)}
                      />
                    </div>
                  </div>

                  <div className="disk-image-manager__field">
                    <label>{t('diskManager.create.formatLabel')}</label>
                    <CustomSelect
                      value={newImageFormat}
                      options={formatOptions}
                      onChange={(value) => setNewImageFormat(value as ImageFormat)}
                    />
                  </div>
                </div>
              </div>

              <button
                className="button button--primary disk-image-manager__action-btn"
                onClick={handleCreateImage}
                disabled={!newImageName.trim()}
                type="button"
              >
                <CreateIcon />
                {t('diskManager.create.button')}
              </button>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="disk-image-manager__section disk-image-manager__tab-panel" key="manage">
              <div className="disk-image-manager__intro">
                <h3>{t('diskManager.manage.title')}</h3>
                <p>{t('diskManager.manage.description')}</p>
              </div>

              {importedImages.length === 0 ? (
                <div className="disk-image-manager__empty">
                  <DiskIcon />
                  <p>{t('diskManager.manage.empty')}</p>
                </div>
              ) : (
                <div className="disk-image-manager__list">
                  {importedImages.map((image) => (
                    <div key={image.id} className="disk-image-item">
                      <div
                        className="disk-image-item__header"
                        onClick={() => toggleExpand(image.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && toggleExpand(image.id)}
                      >
                        <div className="disk-image-item__icon">
                          <DiskIcon />
                        </div>
                        <div className="disk-image-item__info">
                          <strong>{image.name}</strong>
                          <span className="disk-image-item__meta">
                            {image.format.toUpperCase()} · {formatFileSize(image.virtualSize, image.unit)}
                          </span>
                        </div>
                        <div className="disk-image-item__actions">
                          <button
                            className="button button--ghost button--icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(image.id);
                            }}
                            type="button"
                            title={t('diskManager.manage.remove')}
                          >
                            <TrashIcon />
                          </button>
                          <span className="disk-image-item__expand">
                            <ExpandIcon expanded={expandedImageId === image.id} />
                          </span>
                        </div>
                      </div>

                      {expandedImageId === image.id && (
                        <div className="disk-image-item__details">
                          <div className="disk-image-item__section">
                            <h4>{t('diskManager.details.basicInfo')}</h4>
                            <div className="disk-image-item__info-grid">
                              <div className="info-row">
                                <span className="info-label">{t('diskManager.details.path')}</span>
                                <span className="info-value" title={image.path}>{image.path}</span>
                              </div>
                              <div className="info-row">
                                <span className="info-label">{t('diskManager.details.format')}</span>
                                <span className="info-value">{image.format.toUpperCase()}</span>
                              </div>
                              <div className="info-row">
                                <span className="info-label">{t('diskManager.details.virtualSize')}</span>
                                <span className="info-value">{formatFileSize(image.virtualSize, image.unit)}</span>
                              </div>
                              <div className="info-row">
                                <span className="info-label">{t('diskManager.details.actualSize')}</span>
                                <span className="info-value">{formatFileSize(image.actualSize, image.unit)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="disk-image-item__section">
                            <h4>{t('diskManager.details.operations')}</h4>
                            <div className="disk-image-item__operations">
                              <button className="button button--secondary" type="button">
                                <ResizeIcon />
                                {t('diskManager.operations.resize')}
                              </button>
                              <button className="button button--secondary" type="button">
                                <ConvertIcon />
                                {t('diskManager.operations.convert')}
                              </button>
                              <button className="button button--secondary" type="button">
                                <CleanupIcon />
                                {t('diskManager.operations.cleanup')}
                              </button>
                            </div>
                          </div>

                          <div className="disk-image-item__section">
                            <h4>{t('diskManager.details.advanced')}</h4>
                            <div className="disk-image-item__advanced">
                              <div className="disk-image-item__warning">
                                <WarningIcon />
                                <span>{t('diskManager.details.advancedWarning')}</span>
                              </div>
                              <div className="disk-image-manager__advanced-options">
                                <Checkbox
                                  checked={compression}
                                  onChange={setCompression}
                                  label={t('diskManager.advanced.compression')}
                                />
                                <Checkbox
                                  checked={sparse}
                                  onChange={setSparse}
                                  label={t('diskManager.advanced.sparse')}
                                />
                                <Checkbox
                                  checked={preallocate}
                                  onChange={setPreallocate}
                                  label={t('diskManager.advanced.preallocate')}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
