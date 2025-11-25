import styled from "styled-components";
import { useEffect, useState } from "react";

interface SubProject {
  sub_project_id: number;
  sub_project_name: string;
  sub_project_uuid: string;
  project_name: string;
}

interface Project {
  project_name: string;
  subProjects?: SubProject[];
}

function Main() {
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState("");

  useEffect(() => {
    loadProjectList();
  }, []);

  const loadProjectList = () => {
    window.electron.ipcRenderer.sendMessage('get-project-list');
    window.electron.ipcRenderer.on('get-project-list', (data: any) => {
      console.log('Received project list:', data);

      // 각 프로젝트에 대해 서브프로젝트 가져오기
      const projectsWithSubs: Project[] = [];

      if (data && data.length > 0) {
        data.forEach((project: any) => {
          window.electron.ipcRenderer.sendMessage('get-sub-project-list', [project.project_name]);
        });

        window.electron.ipcRenderer.on('get-sub-project-list', (subData: any) => {
          if (subData && subData.length > 0) {
            const projectName = subData[0].project_name;
            const existingProject = projectsWithSubs.find(p => p.project_name === projectName);

            if (!existingProject) {
              projectsWithSubs.push({
                project_name: projectName,
                subProjects: subData
              });
            }
          }

          setProjectList([...projectsWithSubs]);
        });
      }
    });
  };

  const handleCrawl = () => {
    setIsCrawling(true);
    window.electron.ipcRenderer.sendMessage('crawl-and-save-repositories');
    window.electron.ipcRenderer.on('crawl-and-save-repositories', (result: any) => {
      setIsCrawling(false);
      if (result.success) {
        console.log(`Successfully crawled ${result.count} projects`);
        loadProjectList();
      } else {
        console.error('Crawl failed:', result.error);
      }
    });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedRepo(value);
    if (value) {
      // 여기서 상세 페이지로 이동하거나 다른 작업 수행
      console.log('Selected repository:', value);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Repository List</Title>
        <CrawlButton onClick={handleCrawl} disabled={isCrawling}>
          {isCrawling ? '크롤링 중...' : '프로젝트 크롤링'}
        </CrawlButton>
      </Header>

      <Content>
        <SelectWrapper>
          <Label>저장소로 이동</Label>
          <StyledSelect value={selectedRepo} onChange={handleSelectChange}>
            <option value="">Go to repository</option>
            {projectList.map((project) => (
              <optgroup key={project.project_name} label={project.project_name}>
                {project.subProjects?.map((subProject) => (
                  <option
                    key={subProject.sub_project_uuid}
                    value={subProject.sub_project_uuid}
                  >
                    {subProject.sub_project_name}
                  </option>
                ))}
              </optgroup>
            ))}
          </StyledSelect>
        </SelectWrapper>

        <ProjectGrid>
          {projectList.map((project) => (
            <ProjectCard key={project.project_name}>
              <ProjectTitle>{project.project_name}</ProjectTitle>
              <SubProjectCount>
                {project.subProjects?.length || 0} 개의 저장소
              </SubProjectCount>
              <SubProjectList>
                {project.subProjects?.map((subProject) => (
                  <SubProjectItem key={subProject.sub_project_uuid}>
                    {subProject.sub_project_name}
                  </SubProjectItem>
                ))}
              </SubProjectList>
            </ProjectCard>
          ))}
        </ProjectGrid>

        {projectList.length === 0 && (
          <EmptyState>
            <EmptyText>프로젝트가 없습니다.</EmptyText>
            <EmptySubText>위의 "프로젝트 크롤링" 버튼을 클릭하여 데이터를 가져오세요.</EmptySubText>
          </EmptyState>
        )}
      </Content>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0;
`;

const CrawlButton = styled.button`
  background: rgba(255, 255, 255, 0.9);
  border: none;
  color: #667eea;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);

  &:hover:not(:disabled) {
    background: white;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Content = styled.div`
  flex: 1;
  padding: 32px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.4);
  }
`;

const SelectWrapper = styled.div`
  background: rgba(255, 255, 255, 0.95);
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 32px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 12px;
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  color: #333;
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
  }

  &:hover {
    border-color: #667eea;
  }
`;

const ProjectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const ProjectCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const ProjectTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
  margin: 0 0 8px 0;
`;

const SubProjectCount = styled.div`
  font-size: 13px;
  color: #888;
  margin-bottom: 16px;
`;

const SubProjectList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SubProjectItem = styled.div`
  font-size: 14px;
  color: #555;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  border-left: 3px solid #667eea;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: #ececec;
    padding-left: 16px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: white;
`;

const EmptyText = styled.div`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
`;

const EmptySubText = styled.div`
  font-size: 16px;
  opacity: 0.8;
`;

export default Main;
