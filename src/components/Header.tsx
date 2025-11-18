import styled from "styled-components";
import logo from "../assets/logo3.png";

function Header() {
    return (
        <Container>
            <Img src={logo} alt="Logo" />
            <Title>Catch The Criminal</Title>
        </Container>
    )
}

const Container = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    justify-content: center;
    padding: 8px;
    cursor: default;
    user-select: none;
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

export default Header;
