import styled from "styled-components";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SubProjects } from "./Sidebar";

type ItemProps = {
    title: string;
    projectName: string;
    searchTerm?: string;
    isProjectNameMatch?: boolean;
    subProjects?: SubProjects[];
}

function Item({ title, projectName: projectName, searchTerm = "", isProjectNameMatch = false, subProjects = [] }: ItemProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [subProjectList, setSubProjectList] = useState<SubProjects[]>([]);

    // props로 받은 데이터가 있으면 사용, 없으면 IPC로 가져오기
    useEffect(() => {
        if (subProjects && subProjects.length > 0) {
            setSubProjectList(subProjects);
        } else if (projectName) {
            getSubProjectList(projectName);
        }
    }, [projectName, subProjects.length]);

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
        if (subProjectList.length === 0) return; // 데이터 로드 전에는 토글 안 함
        setIsOpen(!isOpen);
    };

    // 서브프로젝트 필터링: 프로젝트 이름이 매칭되면 모든 서브프로젝트 표시
    const filteredSubProjects = isProjectNameMatch 
        ? subProjectList 
        : subProjectList.filter(sub =>
            sub.sub_project_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // 검색어가 있고 필터링된 서브프로젝트가 있으면 자동으로 열기/닫기
    useEffect(() => {
        if (searchTerm && filteredSubProjects.length > 0 && !isOpen) {
            setIsOpen(true);
        } else if (searchTerm && filteredSubProjects.length === 0 && isOpen) {
            setIsOpen(false);
        }
    }, [searchTerm, filteredSubProjects.length, isOpen]);

    // isOpen 상태나 filteredSubProjects가 변경되면 높이 재계산
    useEffect(() => {
        const content = contentRef.current;
        if (!content) return;

        if (!isOpen) {
            // 닫힐 때
            content.style.height = '0px';
        } else if (filteredSubProjects.length > 0) {
            // 열릴 때 - 높이를 auto로 임시 설정하여 실제 높이 측정
            content.style.transition = 'none'; // 임시로 transition 제거
            content.style.height = 'auto';
            
            const timer = setTimeout(() => {
                if (content) {
                    const height = content.offsetHeight; // offsetHeight 사용
                    content.style.height = '0px';
                    content.style.transition = ''; // transition 복원
                    
                    // 다음 프레임에서 높이 적용
                    requestAnimationFrame(() => {
                        content.style.height = height + 'px';
                    });
                }
            }, 0);
            
            return () => clearTimeout(timer);
        }
    }, [isOpen, filteredSubProjects.length]);

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
