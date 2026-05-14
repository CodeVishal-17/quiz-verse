import { render, screen } from '@testing-library/react';
import App from './App';

test('renders QuizVerse registration page', () => {
  render(<App />);
  expect(screen.getByText(/compete\. qualify\. conquer\./i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
});
