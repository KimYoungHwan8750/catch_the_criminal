import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

// 전역 테스트 함수 (개발자 도구 콘솔에서 사용)
if (typeof window !== 'undefined') {
  (window as any).resetDB = () => {
    console.log('[Test] Requesting database reset...');
    window.electron.ipcRenderer.sendMessage('reset-database');
    window.electron.ipcRenderer.on('reset-database', (result: any) => {
      if (result.success) {
        console.log('[Test] ✅ Database reset successful!');
        console.log('[Test] Please refresh the page to reload data.');
        alert('데이터베이스가 리셋되었습니다!\n페이지를 새로고침하여 데이터를 다시 로드하세요.');
      } else {
        console.error('[Test] ❌ Database reset failed:', result.message);
        alert('데이터베이스 리셋 실패: ' + result.message);
      }
    });
  };
  
  console.log('[Test] Global test functions available:');
  console.log('  - resetDB(): Reset all database tables (except user credentials)');
}

