/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import 'solid-devtools';
import './services/orpc-websocket';
import './services/theme';

import { Router, Route } from '@solidjs/router';
import { Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import App from './App';
import WelcomePage from './pages/welcome';
import CanvasPage from './pages/canvas';
import { store } from './store';

const CanvasRoute = () => {
  const params = useParams<{ id: string }>();
  const canvas = () => store.canvases.find(c => c.id === params.id);

  return (
    <Show
      when={canvas()}
      fallback={
        <div class="flex items-center justify-center h-full">
          <p class="text-xs text-muted-foreground font-mono">Loading canvas...</p>
        </div>
      }
    >
      {(c) => <CanvasPage canvas={c()} />}
    </Show>
  );
};

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
      <Route path="/c/:id" component={CanvasRoute} />
    </Router>
  ),
  root!,
);
