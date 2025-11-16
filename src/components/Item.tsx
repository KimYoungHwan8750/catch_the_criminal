import styled from "styled-components";
import { useRef, useState } from "react";

type ItemProps = {
    title: string;
    projects: string[];
}

function Item({ title, projects }: ItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const handleToggle = () => {
        const content = contentRef.current;
        if (!content) return;

        if (!isOpen) {
            content.style.height = content.scrollHeight + 'px';
        } else {
            content.style.height = '0px';
        }
        setIsOpen(!isOpen);
    };

    return (
        <Details>
            <Summary delay={isOpen ? '0' : '0.3s'} border={isOpen ? '0' : '5px'} onClick={handleToggle}>• {title}</Summary>
            <Content ref={contentRef}>
                {projects.map((project, index) => (
                    <div key={index}>{project}</div>
                ))}
            </Content>
        </Details>
    )
}

const Details = styled.div``;

const Summary = styled.div<{ border: string, delay: string }>`
    background: #444;
    color: #fff;
    padding: 10px;
    outline: 0;
    border-radius: 5px;
    cursor: pointer;
    text-align: left;
    box-shadow: 1px 1px 2px gray;
    user-select: none;
    transition-delay: ${({ delay }) => delay};

    border-bottom-left-radius: ${({ border }) => border};
    border-bottom-right-radius: ${({ border }) => border};
`;

const Content = styled.div`
    font-size: 14px;
    height: 0;
    background: #444;
    overflow: hidden;
    transition: height 0.3s ease;
    border-bottom-left-radius: 5px;
    box-shadow: 1px 1px 2px gray;
    border-bottom-right-radius: 5px;
    
    > div {
        padding: 10px;
        cursor: pointer;
    }

    > div:hover {
        background: #555;
    }
`;

export default Item;