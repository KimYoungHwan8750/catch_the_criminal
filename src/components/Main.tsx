import styled from "styled-components";

function Main() {
  return (
    <Container>
      <Title>Maisssssssssssssn</Title>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #f0f0f0;
  width: 100%;
  height: 100%;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
`;

export default Main;
