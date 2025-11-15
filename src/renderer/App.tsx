import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Layout from '../components/Layout';

function Hello() {
  return (
    <div>
      <h1>Hello</h1>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Hello />} />
        </Route>
      </Routes>
    </Router>
  );
}