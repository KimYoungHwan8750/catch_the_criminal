import styled from "styled-components"
import Item from "./Item";
import { useEffect, useState } from "react";


type Projects = {
  project_id: number;
  project_name: string;
  sub_projects: SubProjects[];
};

export type SubProjects = {
  project_id: number;
  sub_project_id: number;
  sub_project_name: string;
}


function Sidebar() {
    const [projectList, setProjectList] = useState<Projects[]>([]);
    const [isCrawling, setIsCrawling] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadProjects();
        loadLastUpdateTime();
    }, []);

    const loadProjects = () => {
        const unsubscribe = window.electron.ipcRenderer.on('get-project-list', (data: any) => {
          setProjectList([...data])
        });
        window.electron.ipcRenderer.sendMessage('get-project-list', ['ping']);

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    };

    const loadLastUpdateTime = () => {
        window.electron.ipcRenderer.sendMessage('get-last-update-time');
        window.electron.ipcRenderer.on('get-last-update-time', (time: any) => {
            setLastUpdateTime(time);
        });
    };

    const handleCrawl = () => {
        setIsCrawling(true);
        window.electron.ipcRenderer.sendMessage('crawl-and-save-repositories');
        window.electron.ipcRenderer.on('crawl-and-save-repositories', (result: any) => {
            setIsCrawling(false);
            if (result.success) {
                console.log(`Successfully crawled ${result.count} projects`);
                loadProjects();
                loadLastUpdateTime();
            } else {
                console.error('Crawl failed:', result.error);
            }
        });
    };

    const formatDateTime = (isoString: string | null) => {
        if (!isoString) return '데이터 없음';
        const date = new Date(isoString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // 프로젝트 이름 및 서브 프로젝트 이름으로 필터링
    const filteredProjects = projectList.filter(project => {
        const searchLower = searchTerm.toLowerCase().trim();

        // 프로젝트 이름 검색
        const projectNameMatch = project.project_name.toLowerCase().includes(searchLower);

        // 서브 프로젝트 이름 검색
        const subProjectMatch = project.sub_projects?.some(subProject =>
            subProject.sub_project_name.toLowerCase().includes(searchLower)
        );



        return projectNameMatch || subProjectMatch;
    });

    return (
        <Container>
            <Header>
                <Title>Project List</Title>
                <CrawlButton onClick={handleCrawl} disabled={isCrawling}>
                    {isCrawling ? '🔄 갱신 중...' : '🔄 갱신'}
                </CrawlButton>
            </Header>
            <UpdateInfo>
                최근 갱신: {formatDateTime(lastUpdateTime)}
            </UpdateInfo>
            <SearchWrapper>
                <SearchIcon>🔍</SearchIcon>
                <SearchInput
                    type="text"
                    placeholder="프로젝트 또는 서브프로젝트 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <ClearButton onClick={() => setSearchTerm('')}>✕</ClearButton>
                )}
            </SearchWrapper>
            <ProjectList>
                {filteredProjects.map((project) => {
                    // 프로젝트 이름이 매칭되는지 확인
                    const isProjectNameMatch = project.project_name.toLowerCase().includes(searchTerm.toLowerCase().trim());

                    return (
                        <Item
                            key={project['project_id']}
                            title={project['project_name']}
                            projectName={project['project_name']}
                            searchTerm={searchTerm}
                            isProjectNameMatch={isProjectNameMatch}
                        />
                    );
                })}
                {filteredProjects.length === 0 && searchTerm && (
                    <NoResults>
                        검색 결과가 없습니다.
                    </NoResults>
                )}
            </ProjectList>
        </Container>
    )
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 700px;
    height: 100%;
    box-sizing: border-box;
    background-color: #f0f0f0;
    border-right: 1px solid #e0e0e0;
    color: white;
    position: sticky;
    left: 0;
    top: 0;
`

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    gap: 12px;
`

const Title = styled.h1`
    font-size: 20px;
    font-weight: 600;
    color: #c01515;
    margin: 0;
    cursor: default;
    user-select: none;
`

const CrawlButton = styled.button`
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;

    &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    &:active:not(:disabled) {
        transform: translateY(0);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`

const UpdateInfo = styled.div`
    font-size: 12px;
    color: #666;
    padding: 0 16px 12px 16px;
`

const SearchWrapper = styled.div`
    position: relative;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    background: white;
`

const SearchIcon = styled.span`
    position: absolute;
    left: 28px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 16px;
    pointer-events: none;
`

const SearchInput = styled.input`
    width: 100%;
    padding: 10px 40px 10px 40px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.3s ease;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    &::placeholder {
        color: #999;
    }
`

const ClearButton = styled.button`
    position: absolute;
    right: 28px;
    top: 50%;
    transform: translateY(-50%);
    background: #ddd;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    color: #666;
    transition: all 0.2s ease;

    &:hover {
        background: #ccc;
    }
`

const NoResults = styled.div`
    text-align: center;
    padding: 40px 20px;
    color: #999;
    font-size: 14px;
`

const ProjectList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    &::-webkit-scrollbar {
        width: 5px;
    }
    &::-webkit-scrollbar-track {
        background-color: transparent;
    }
    &::-webkit-scrollbar-thumb {
        background-color: #667eea;
        border-radius: 10px;
    }
    &::-webkit-scrollbar-thumb:hover {
        background-color: #5976f7;
    }
`

export default Sidebar;
