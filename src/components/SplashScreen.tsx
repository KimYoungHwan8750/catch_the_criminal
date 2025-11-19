import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSignedIn = () => {
      window.electron.ipcRenderer.sendMessage('check-signed-in');
    };

    const removeListener = window.electron.ipcRenderer.on('check-signed-in', (signedIn: unknown) => {
      if (signedIn) {
        navigate('/main');
      } else {
      }
    });

    checkSignedIn();

    return () => {
      removeListener();
    };
  }, [navigate]);

  return (
    <Container>
      <Logo>🔍</Logo>
      <Title>Catch The Criminal</Title>
      <LoginContainer>Login</LoginContainer>

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

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

export default SplashScreen;

