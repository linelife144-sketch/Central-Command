import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { PhotoCapture } from './PhotoCapture';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function buildFile(name = 'photo.jpg', type = 'image/jpeg', sizeBytes = 1024): File {
  const file = new File(['x'.repeat(sizeBytes)], name, { type });
  return file;
}

describe('PhotoCapture', () => {
  it('renders capture/upload buttons labeled with the provided label', () => {
    render(<PhotoCapture value={null} onChange={vi.fn()} label="Vehicle" />);

    expect(screen.getByRole('button', { name: /capture vehicle/i })).not.toBeNull();
    expect(screen.getByRole('button', { name: /upload vehicle/i })).not.toBeNull();
  });

  it('shows the help message when nothing is attached', () => {
    render(<PhotoCapture value={null} onChange={vi.fn()} label="Vehicle" helpMessage="Attach a vehicle photo." />);

    expect(screen.getByText('Attach a vehicle photo.')).not.toBeNull();
  });

  it('shows the stored message when an existing photo URL is provided and no new file is selected', () => {
    render(
      <PhotoCapture
        value={null}
        onChange={vi.fn()}
        label="Vehicle"
        existingPhotoUrl="https://example.com/vehicle.jpg"
        storedMessage="Already on file."
      />,
    );

    expect(screen.getByText('Already on file.')).not.toBeNull();
  });

  it('calls onChange with a valid file selection', () => {
    const onChange = vi.fn();
    render(<PhotoCapture value={null} onChange={onChange} label="Vehicle" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = buildFile();

    fireEvent.change(input, { target: { files: [file] } });

    expect(onChange).toHaveBeenCalledWith(file);
  });

  it('rejects an oversized file without calling onChange', () => {
    const onChange = vi.fn();
    render(<PhotoCapture value={null} onChange={onChange} label="Vehicle" maxSizeMB={0.000001} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = buildFile('big.jpg', 'image/jpeg', 2048);

    fireEvent.change(input, { target: { files: [file] } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders a Remove button only when a file is attached, and clears it on click', () => {
    const onChange = vi.fn();
    const file = buildFile();
    const { rerender } = render(<PhotoCapture value={null} onChange={onChange} label="Vehicle" />);

    expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();

    rerender(<PhotoCapture value={file} onChange={onChange} label="Vehicle" />);
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
