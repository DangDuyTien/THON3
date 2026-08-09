import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App.jsx';

try {
  const html = renderToString(<App />);
  console.log("RENDER SUCCESS", html.substring(0, 50));
} catch(e) {
  console.error("RENDER FAILED");
  console.error(e);
}
