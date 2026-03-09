/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import 'solid-devtools';
import './services/orpc-websocket';

import { Router, Route } from '@solidjs/router';
import App from './App';
import WelcomePage from './pages/welcome';
import CanvasPage from './pages/canvas';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(
  () => (
    <Router root={App}>
      <Route path="/" component={WelcomePage} />
      <Route path="/c/:id" component={CanvasPage} />
    </Router>
  ),
  root!,
);
