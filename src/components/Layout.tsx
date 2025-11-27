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
  height: calc(100vh - 70px);
`;

const FlexContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`

const MainContent = styled.main`
  width: 100%;
  overflow-y: auto;
`;

export default Layout;

