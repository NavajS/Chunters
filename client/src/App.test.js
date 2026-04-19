import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      BrowserRouter: ({ children }) => <>{children}</>,
      Routes: ({ children }) => <>{children}</>,
      Route: ({ element }) => element,
      Navigate: () => null,
      useNavigate: () => jest.fn(),
      useParams: () => ({ token: 'test-token' }),
    };
  },
  { virtual: true },
);

test('renders login page at root route', () => {
  render(<App />);
  expect(screen.getByText(/Welcome to Chunters/i)).toBeInTheDocument();
});
