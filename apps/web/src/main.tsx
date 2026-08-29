import React from 'react';
import ReactDOM from 'react-dom/client';
import '@vectoria/ui/tokens/index.css';
import './app/editor.css';
import { EditorApp } from './app/EditorApp.js';
import { ensurePdfWorker } from './app/pdf-worker.js';

ensurePdfWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EditorApp />
  </React.StrictMode>
);
