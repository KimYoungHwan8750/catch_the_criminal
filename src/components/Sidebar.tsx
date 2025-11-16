import styled from "styled-components"
import Item from "./Item";
import { useEffect, useState } from "react";


type Projects = Record<string, SubProjects>;
type SubProjects = {
    project_name: string;
    sub_projects: string[];
}

function Sidebar() {
    const [projectList, setProjectList] = useState<string[]>([]);
    useEffect(() => {
        const unsubscribe = window.electron.ipcRenderer.on('get-project-list', (data: any) => {
            const projects: Projects = {};
            data.forEach((project: any) => {
                projects[data['project_id']] = {
                    project_name: '',
                    sub_projects: []
                };
                projects[data['project_id']]['project_name'] = project['project_name'];
                projects[data['project_id']]['sub_projects'].push(project['sub_projects']);
            })
            console.log(data);
            setProjectList(data);
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
                <Item key={project['project_id']} title={project['project_name']} projects={project['sub_project_name']} />
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