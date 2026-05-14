import { render, screen } from '@testing-library/react';
import App from './App';

test('renders QuizVerse login page', () => {
  render(<App />);
  expect(screen.getByText(/enter the arena\./i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});
