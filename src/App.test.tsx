import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('Tone Lab', () => {
  it('spells scales correctly when the root changes', async () => {
    window.location.hash = '/scales';
    const user = userEvent.setup();
    render(<App />);
    const notes = () => [...screen.getByTestId('spelling').querySelectorAll('b')].map((b) => b.textContent).join(' ');
    expect(notes()).toBe('C D E F G A B');
    await user.selectOptions(screen.getByLabelText('Root'), 'F');
    expect(screen.getByTestId('spelling')).toHaveTextContent('B♭');
    expect(screen.getByText(/1 flat/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Scale'), 'harmonic');
    expect(notes()).toBe('F G A♭ B♭ C D♭ E');
  });

  it('builds a chord with intervals from the root', async () => {
    window.location.hash = '/chords';
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText('Root'), 'Bb');
    await user.selectOptions(screen.getByLabelText('Quality'), 'min7');
    const table = screen.getByRole('table', { name: 'Chord tones' });
    expect(within(table).getByText('D♭')).toBeInTheDocument();
    expect(within(table).getByText('Minor 7th')).toBeInTheDocument();
  });

  it('names an interval from two clicked keys and from the computer keyboard', async () => {
    window.location.hash = '/intervals';
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('interval')).toHaveTextContent('Major 3rd');
    await user.click(screen.getByRole('button', { name: /^F4/ }));
    expect(screen.getByTestId('interval')).toHaveTextContent('Pick a second key');
    const piano = screen.getByRole('group', { name: /Pick two keys/ });
    fireEvent.keyDown(piano, { key: 'k' }); // C5
    expect(screen.getByTestId('interval')).toHaveTextContent('Perfect 5th');
  });

  it('runs a drill and records the result', async () => {
    window.location.hash = '/practice';
    const user = userEvent.setup();
    render(<App />);
    const options = screen.getAllByRole('button').filter((b) => b.classList.contains('option'));
    await user.click(options[0]);
    expect(screen.getByRole('status')).toHaveTextContent(/Correct!|Not quite/);
    expect(screen.getByText(/1 answered/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next question →' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('builds a scale on the keys', async () => {
    window.location.hash = '/practice';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Build the scale' }));
    expect(screen.getByText(/Select the notes of/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^C4/ }));
    await user.click(screen.getByRole('button', { name: /Check \(1 selected\)/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Not quite');
  });
});
