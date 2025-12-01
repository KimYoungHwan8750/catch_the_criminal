import styled from "styled-components";
import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";

interface Commit {
  commit_id: string;
  committer: string;
  commit_msg: string;
  commit_date: string;
}

interface CommitFile {
  commit_id: string;
  commit_file: string;
  commit_content: string;
}

interface Branch {
  name: string;
  isDefault: boolean;
}

function Main() {
  const { uuid } = useParams<{ uuid: string }>();
  const location = useLocation();
  const subProjectName = location.state?.subProjectName || '';
  const projectName = location.state?.projectName || '';

  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);

  const [selectedBranch, setSelectedBranch] = useState('master');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [fileNameFilter, setFileNameFilter] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);

  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [commitFiles, setCommitFiles] = useState<CommitFile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CommitFile | null>(null);

  useEffect(() => {
    if (uuid) {
      // 자동 크롤링 시작
      startAutoCrawl();
    }
  }, [uuid]);

  useEffect(() => {
    if (uuid && (selectedAuthor || fileNameFilter)) {
      loadCommits();
    }
  }, [selectedAuthor, fileNameFilter]);

  const startAutoCrawl = async () => {
    if (!uuid) return;

    setIsCrawling(true);

    // 브랜치 로드
    loadBranches();

    // 커밋 크롤링
    window.electron.ipcRenderer.sendMessage('crawl-commits', {
      uuid,
      branch: selectedBranch
    });

    window.electron.ipcRenderer.on('crawl-commits', (result: any) => {
      setIsCrawling(false);
      if (result.success) {
        console.log(`Successfully crawled ${result.count} commits`);
        loadCommits();
        loadAuthors();
      } else {
        console.error('Crawl failed:', result.error);
        // 크롤링 실패해도 DB에서 로드 시도
        loadCommits();
        loadAuthors();
      }
    });
  };

  const loadBranches = () => {
    if (!uuid) return;

    window.electron.ipcRenderer.sendMessage('get-branches', uuid);
    window.electron.ipcRenderer.on('get-branches', (data: any) => {
      if (data && data.length > 0) {
        setBranches(data);
        // 기본 브랜치 설정
        const defaultBranch = data.find((b: Branch) => b.isDefault);
        if (defaultBranch) {
          setSelectedBranch(defaultBranch.name);
        } else if (data.length > 0) {
          setSelectedBranch(data[0].name);
        }
      } else {
        setBranches([{ name: 'master', isDefault: true }]);
        setSelectedBranch('master');
      }
    });
  };

  const loadAuthors = () => {
    window.electron.ipcRenderer.sendMessage('get-authors-from-db', uuid);
    window.electron.ipcRenderer.on('get-authors-from-db', (data: any) => {
      if (data && data.length > 0) {
        setAuthors(data);
      } else {
        // DB에 없으면 크롤링
        window.electron.ipcRenderer.sendMessage('crawl-authors', uuid);
      }
    });

    window.electron.ipcRenderer.on('crawl-authors', (data: any) => {
      if (data) {
        setAuthors(data);
      }
    });
  };

  const loadCommits = () => {
    if (!uuid) return;

    window.electron.ipcRenderer.sendMessage('get-commits-from-db', {
      uuid,
      fileName: fileNameFilter || undefined,
      author: selectedAuthor || undefined
    });

    window.electron.ipcRenderer.on('get-commits-from-db', (data: any) => {
      if (data && data.length > 0) {
        setCommits(data);
      } else {
        setCommits([]);
      }
    });
  };


  const handleCommitClick = (commit: Commit) => {
    setSelectedCommit(commit);

    window.electron.ipcRenderer.sendMessage('get-commit-detail-from-db', commit.commit_id);
    window.electron.ipcRenderer.on('get-commit-detail-from-db', (data: any) => {
      if (data) {
        setCommitFiles(data);
        setShowModal(true);
      }
    });
  };

  const handleFileClick = (file: CommitFile) => {
    setSelectedFile(file);
  };

  const renderDiff = (diff: string) => {
    if (!diff) return null;

    const lines = diff.split('\n');
    return lines.map((line, index) => {
      let bgColor = 'transparent';
      if (line.startsWith('+') && !line.startsWith('+++')) {
        bgColor = '#e6ffec';
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        bgColor = '#ffebe9';
      }

      return (
        <DiffLine key={index} bgColor={bgColor}>
          {line}
        </DiffLine>
      );
    });
  };

  // 로딩 중일 때
  if (isCrawling) {
    return (
      <Container>
        <LoadingOverlay>
          <LoadingSpinner />
          <LoadingText>커밋 정보를 불러오는 중입니다...</LoadingText>
          <LoadingSubText>잠시만 기다려주세요</LoadingSubText>
        </LoadingOverlay>
      </Container>
    );
  }

  return (
    <Container>
      <Toolbar>
        <ProjectInfo>
          <ProjectName>{projectName}</ProjectName>
          <SubProjectName>{subProjectName}</SubProjectName>
        </ProjectInfo>

        <ToolbarControls>
          <FilterGroup>
            <Label>브랜치</Label>
            <Select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {branches.map((branch, idx) => (
                <option key={idx} value={branch.name}>
                  {branch.name} {branch.isDefault ? '(기본)' : ''}
                </option>
              ))}
            </Select>
          </FilterGroup>

          <FilterGroup>
            <Label>파일명</Label>
            <Input
              type="text"
              placeholder="파일명으로 검색..."
              value={fileNameFilter}
              onChange={(e) => setFileNameFilter(e.target.value)}
            />
          </FilterGroup>

          <FilterGroup>
            <Label>작성자</Label>
            <Select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
            >
              <option value="">전체</option>
              {authors.map((author, idx) => (
                <option key={idx} value={author}>{author}</option>
              ))}
            </Select>
          </FilterGroup>
        </ToolbarControls>
      </Toolbar>

      <CommitList>
        {commits.length === 0 ? (
          <NoCommits>커밋이 없습니다.</NoCommits>
        ) : (
          commits.map((commit) => (
            <CommitItem key={commit.commit_id} onClick={() => handleCommitClick(commit)}>
              <CommitMessage>{commit.commit_msg}</CommitMessage>
              <CommitMeta>
                <Author>👤 {commit.committer}</Author>
                <Date>📅 {commit.commit_date}</Date>
              </CommitMeta>
            </CommitItem>
          ))
        )}
      </CommitList>

      {showModal && selectedCommit && (
        <Modal onClick={() => { setShowModal(false); setSelectedFile(null); }}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{selectedCommit.commit_msg}</ModalTitle>
              <CloseButton onClick={() => { setShowModal(false); setSelectedFile(null); }}>✕</CloseButton>
            </ModalHeader>

            <ModalBody>
              {!selectedFile ? (
                <>
                  <CommitInfo>
                    <InfoRow>
                      <InfoLabel>작성자:</InfoLabel>
                      <InfoValue>{selectedCommit.committer}</InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>날짜:</InfoLabel>
                      <InfoValue>{selectedCommit.commit_date}</InfoValue>
                    </InfoRow>
                  </CommitInfo>

                  <FileListTitle>변경된 파일 ({commitFiles.length})</FileListTitle>
                  <FileList>
                    {commitFiles.map((file, idx) => (
                      <FileItem key={idx} onClick={() => handleFileClick(file)}>
                        📄 {file.commit_file}
                      </FileItem>
                    ))}
                  </FileList>
                </>
              ) : (
                <>
                  <BackButton onClick={() => setSelectedFile(null)}>← 뒤로</BackButton>
                  <FileTitle>{selectedFile.commit_file}</FileTitle>
                  <DiffContainer>
                    <pre>{renderDiff(selectedFile.commit_content)}</pre>
                  </DiffContainer>
                </>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
`;

const Toolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const ProjectInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ProjectName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const SubProjectName = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
`;

const ToolbarControls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #555;
  white-space: nowrap;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  min-width: 200px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  min-width: 150px;
  cursor: pointer;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #f5f5f5;
  }
`;

const LoadingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const LoadingSpinner = styled.div`
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin-top: 24px;
`;

const LoadingSubText = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-top: 8px;
`;

const CommitList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const NoCommits = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 16px;
`;

const CommitItem = styled.div`
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #667eea;
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
`;

const CommitMessage = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
`;

const CommitMeta = styled.div`
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #666;
`;

const Author = styled.span``;

const Date = styled.span``;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
`;

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
  padding-right: 20px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background: #f0f0f0;
    color: #333;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const CommitInfo = styled.div`
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const InfoRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: #555;
  min-width: 80px;
`;

const InfoValue = styled.span`
  color: #333;
`;

const FileListTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
`;

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FileItem = styled.div`
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &:hover {
    background: #667eea;
    color: white;
    border-color: #667eea;
    transform: translateX(4px);
  }
`;

const BackButton = styled.button`
  background: #f0f0f0;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;
  transition: all 0.2s ease;

  &:hover {
    background: #e0e0e0;
  }
`;

const FileTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
`;

const DiffContainer = styled.div`
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: auto;
  max-height: 600px;

  pre {
    margin: 0;
    padding: 16px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.5;
  }
`;

const DiffLine = styled.div<{ bgColor: string }>`
  background-color: ${props => props.bgColor};
  padding: 2px 8px;
  white-space: pre;
`;

export default Main;
