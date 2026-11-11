import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/themes.css';
import './styles/base.css';
import './styles/alerts.css';

createRoot(document.getElementById('root')).render(<App />);