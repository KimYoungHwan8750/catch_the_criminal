import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

function SplashScreen() {
  const navigate = useNavigate();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkSignedIn = () => {
      window.electron.ipcRenderer.sendMessage('check-signed-in');
    };

    const removeListener = window.electron.ipcRenderer.on('check-signed-in', (signedIn: unknown) => {
      if (signedIn) {
        navigate('/main');
      } else {
        setShowLoginForm(true);
      }
      setLoading(false);
    });

    checkSignedIn();

    return () => {
      removeListener();
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError('유저명과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    // DB에 자격증명 저장
    window.electron.ipcRenderer.sendMessage('save-credentials', { username, password });

    // 자격증명 저장 응답 대기
    const removeSaveListener = window.electron.ipcRenderer.on('save-credentials', (result: any) => {
      if (result.success) {
        // 로그인 시도
        window.electron.ipcRenderer.sendMessage('login-with-credentials', { username, password });
      } else {
        setError('자격증명 저장에 실패했습니다.');
        setLoading(false);
      }
      removeSaveListener();
    });

    // 로그인 응답 대기
    const removeLoginListener = window.electron.ipcRenderer.on('login-with-credentials', (success: unknown) => {
      if (success) {
        navigate('/main');
      } else {
        setError('로그인에 실패했습니다. 유저명과 비밀번호를 확인해주세요.');
        setLoading(false);
      }
      removeLoginListener();
    });
  };

  if (!showLoginForm) {
    return (
      <Container>
        <Logo>🔍</Logo>
        <Title>Catch The Criminal</Title>
        <LoadingText>로그인 상태를 확인하는 중...</LoadingText>
      </Container>
    );
  }

  return (
    <Container>
      <Logo>🔍</Logo>
      <Title>Catch The Criminal</Title>

      <LoginForm onSubmit={handleLogin}>
        <FormTitle>Sign In</FormTitle>

        <InputGroup>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username을 입력해주세요."
            disabled={loading}
          />
        </InputGroup>

        <InputGroup>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password를 입력해주세요."
            disabled={loading}
          />
        </InputGroup>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <LoginButton type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </LoginButton>
      </LoginForm>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const Logo = styled.div`
  font-size: 80px;
  margin-bottom: 20px;
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 20px;
`;

const LoadingText = styled.p`
  font-size: 18px;
  opacity: 0.8;
`;

const LoginForm = styled.form`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 400px;
  margin-top: 20px;
`;

const FormTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 30px;
  text-align: center;
`;

const InputGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.9);
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(255, 59, 48, 0.2);
  border: 1px solid rgba(255, 59, 48, 0.4);
  color: #ffcccc;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
`;

const LoginButton = styled.button`
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: #1a1a1a;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  box-sizing: border-box;

  &:hover:not(:disabled) {
    background: #2a2a2a;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    background: #0a0a0a;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #333333;
  }
`;

export default SplashScreen;

