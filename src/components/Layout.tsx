import { Outlet } from 'react-router-dom';
import Header from './Header';
import styled from 'styled-components';
import Sidebar from './Sidebar';

function Layout() {
  return (
    <Container>
      <Header />
      <Sidebar />
      <MainContent>
        <Outlet />
      </MainContent>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
`;

const MainContent = styled.main`
  flex: 1;
  overflow: auto;
`;

export default Layout;

