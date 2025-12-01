import styled from "styled-components";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SubProjects } from "./Sidebar";

type ItemProps = {
    title: string;
    projectName: string;
    searchTerm?: string;
    isProjectNameMatch?: boolean;
}

function Item({ title, projectName: projectName, searchTerm = "", isProjectNameMatch = false }: ItemProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [subProjectList, setSubProjectList] = useState<SubProjects[]>([]);

    useEffect(() => {
      getSubProjectList(projectName);
    }, [projectName]);

    function getSubProjectList(projectName: string) {
      const unsubscribe = window.electron.ipcRenderer.on('get-sub-project-list', (data: any) => {
        setSubProjectList([...data]);
      });
      window.electron.ipcRenderer.sendMessage('get-sub-project-list', [projectName]);
      return () => {
        if (unsubscribe) {
            unsubscribe();
        }
      }
    }

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

    // 서브프로젝트 필터링: 프로젝트 이름이 매칭되면 모든 서브프로젝트 표시
    const filteredSubProjects = isProjectNameMatch 
        ? subProjectList 
        : subProjectList.filter(sub =>
            sub.sub_project_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // 검색어가 있고 필터링된 서브프로젝트가 있으면 자동으로 열기
    useEffect(() => {
        const content = contentRef.current;
        if (!content) return;

        if (searchTerm && filteredSubProjects.length > 0 && !isOpen) {
            setIsOpen(true);
            // DOM 업데이트 후 높이 계산
            requestAnimationFrame(() => {
                if (content) {
                    content.style.height = content.scrollHeight + 'px';
                }
            });
        } else if (searchTerm && filteredSubProjects.length === 0 && isOpen) {
            content.style.height = '0px';
            setIsOpen(false);
        }
    }, [searchTerm, filteredSubProjects.length]);

    // isOpen이 true일 때 filteredSubProjects가 변경되면 높이 재계산
    useEffect(() => {
        const content = contentRef.current;
        if (!content || !isOpen) return;

        requestAnimationFrame(() => {
            if (content) {
                content.style.height = content.scrollHeight + 'px';
            }
        });
    }, [filteredSubProjects.length, isOpen]);

    // 검색어가 있고 매칭되는 서브프로젝트가 없으면 프로젝트 자체를 숨김
    // 단, 프로젝트 이름이 매칭되는 경우는 제외
    if (searchTerm && filteredSubProjects.length === 0 && !isProjectNameMatch) {
        return null;
    }

    const handleSubProjectClick = (subProject: SubProjects) => {
        navigate(`/main/${subProject.sub_project_uuid}`, {
            state: {
                subProjectName: subProject.sub_project_name,
                projectName: projectName
            }
        });
    };

    return (
        <Details>
            <Summary delay={isOpen ? '0' : '0.3s'} border={isOpen ? '0' : '5px'} onClick={handleToggle}>• {title}</Summary>
            <Content ref={contentRef}>
                {filteredSubProjects?.map((sub_project, index) => (
                    <SubProjectItem 
                        key={index}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSubProjectClick(sub_project);
                        }}
                    >
                        {sub_project.sub_project_name}
                    </SubProjectItem>
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
`;

const SubProjectItem = styled.div`
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: #555;
        padding-left: 15px;
    }

    &:active {
        background: #667eea;
    }
`;

export default Item;
