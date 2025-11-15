import styled from "styled-components";

type ItemProps = {
    on: boolean;

}
function Item() {
    return (
        <Container>
            테스트
        </Container>
    )
}

const Container = styled.button`
    border: 1px solid #c5c5c5;
    padding: 16px;
    border-radius: 16px;
    box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.1);
    background-color: #ffffff;
    cursor: pointer;
    user-select: none;
`;

export default Item;