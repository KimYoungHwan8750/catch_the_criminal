import { Outlet } from 'react-router-dom';
import Header from './Header';
import styled from 'styled-components';
import Sidebar from './Sidebar';

function Layout() {
  return (
    <Container>
      <Header />
      <FlexContainer>
        <Sidebar />
        <MainContent>
          <Outlet />
        </MainContent>
      </FlexContainer>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
`;

const FlexContainer = styled.div`
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 0;
`;

const MainContent = styled.main`
  flex: 1;
  height: 100%;
  overflow-y: auto;
`;

export default Layout;

