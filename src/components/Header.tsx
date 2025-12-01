import styled from "styled-components";
import logo from "../assets/logo3.png";
import { useEffect } from "react";

function Header() {
    useEffect(() => {
        const unsubscribe = window.electron.ipcRenderer.on('logout', (result) => {
            if (result) {
                console.log('Logged out successfully');
                window.location.reload();
            } else {
                console.error('Logout failed');
            }
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    const handleLogout = () => {
        window.electron.ipcRenderer.sendMessage('logout');
    };

    return (
        <Container>
            <LogoTitleWrapper>
                <Img src={logo} alt="Logo" />
                <Title>Catch The Criminal</Title>
            </LogoTitleWrapper>
            <LogoutButton onClick={handleLogout}>
                로그아웃
            </LogoutButton>
        </Container>
    )
}

const Container = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    height: 70px;
    padding: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: sticky;
    top:0;
    box-sizing: border-box;
    cursor: default;
    user-select: none;
`

const LogoTitleWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    justify-content: center;
`

const Img = styled.img`
    width: 50px;
    height: 50px;
    border-radius: 16px;
`

const Title = styled.h1`
    font-size: 24px;
    font-weight: 600;
    color: white;
`

const LogoutButton = styled.button`
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 8px 20px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);

    &:hover {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }
`

export default Header;
