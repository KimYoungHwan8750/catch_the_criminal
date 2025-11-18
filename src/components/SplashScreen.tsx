import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // 2초 후 메인 화면으로 이동
    const timer = setTimeout(() => {
      navigate('/main');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Container>
      <Logo>🔍</Logo>
      <Title>Catch The Criminal</Title>
      <LoadingText>로딩 중...</LoadingText>
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

export default SplashScreen;

