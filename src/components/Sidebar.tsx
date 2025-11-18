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

    console.log("projectList", projectList);
    useEffect(() => {
        const unsubscribe = window.electron.ipcRenderer.on('get-project-list', (data: any) => {
          setProjectList([...data])
        });
        window.electron.ipcRenderer.sendMessage('get-project-list', ['ping']);

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [])
    return (
        <Container>
            <Title>Project List</Title>
            {projectList.map((project) => (
              <Item key={project['project_id']} title={project['project_name']} projectId={project['project_id']}/>
            ))}
        </Container>
    )
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 300px;
    height: 100%;
    padding: 16px;
    box-sizing: border-box;
    overflow-y: scroll;
    background-color: #f0f0f0;
    border-right: 1px solid #e0e0e0;
    gap: 8px;
    color: white;
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
