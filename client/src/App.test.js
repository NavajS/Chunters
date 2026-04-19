import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page at root route', () => {
  render(<App />);
  expect(screen.getByText(/Welcome to Chunters/i)).toBeInTheDocument();
});
