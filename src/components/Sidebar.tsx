import styled from "styled-components"
import Item from "./Item";

function Sidebar() {
    return (
        <Container>
            <Title>Project List</Title>
            <Item></Item>
        </Container>
    )
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 300px;
    height: 100%;
    padding: 16px;
    overflow-y: scroll;
    background-color: #f0f0f0;
    border-right: 1px solid #e0e0e0;
    &::-webkit-scrollbar {
        width: 5px;
    }
    &::-webkit-scrollbar-track {
        background-color: transparent;
    }
    &::-webkit-scrollbar-thumb {
        background-color: #c01515;
        border-radius: 10px;
    }
    &::-webkit-scrollbar-thumb:hover {
        background-color: #B50505;
    }
`

const Title = styled.h1`
    font-size: 20px;
    font-weight: 600;
    color: #c01515;
    margin-bottom: 16px;
    cursor: default;
    user-select: none;
`

export default Sidebar;