import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders QuizVerse landing page', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  expect(screen.getByText(/quizverse/i)).toBeInTheDocument();
  expect(screen.getByText(/compete\./i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /enter system/i })).toBeInTheDocument();
});
