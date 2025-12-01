import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Layout from '../components/Layout';
import Main from '../components/Main';
import SplashScreen from '../components/SplashScreen';

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
        {/* 레이아웃 없는 스플래시 스크린 */}
        <Route path="/" element={<SplashScreen />} />

        {/* 레이아웃이 적용되는 페이지들 */}
        <Route element={<Layout />}>
          <Route path="/main" element={<Main />} />
          <Route path="/main/:uuid" element={<Main />} />
          {/* 다른 페이지들도 여기에 추가 */}
        </Route>
      </Routes>
    </Router>
  );
}
