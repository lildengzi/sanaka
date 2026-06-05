import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MaterialSelect } from './MaterialSelect';

describe('MaterialSelect', () => {
  it('opens upward when there is not enough space below the trigger', async () => {
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 32,
      y: 730,
      top: 730,
      bottom: 778,
      left: 32,
      right: 232,
      width: 200,
      height: 48,
      toJSON: () => ({})
    } as DOMRect);

    const user = userEvent.setup();
    render(
      <MaterialSelect
        label="语言"
        value="zh-CN"
        options={[
          { value: 'zh-CN', label: 'zh-CN' },
          { value: 'en-US', label: 'en-US' },
          { value: 'ja-JP', label: 'ja-JP' }
        ]}
        onChange={() => undefined}
      />
    );

    await user.click(screen.getByRole('button', { name: '语言' }));

    expect(screen.getByRole('listbox', { name: '语言' })).toHaveClass('material-select__menu--up');
    expect(screen.getByRole('listbox', { name: '语言' })).toHaveStyle({ width: '200px' });

    rectSpy.mockRestore();
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
  });
});
