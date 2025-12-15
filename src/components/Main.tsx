import styled from "styled-components";
import { useEffect, useState, useRef } from "react";
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
  const [crawlProgress, setCrawlProgress] = useState<{ current: number; total: number | null; phase?: string; message?: string } | null>(null);

  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [commitFiles, setCommitFiles] = useState<CommitFile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CommitFile | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [lastClickedCommitId, setLastClickedCommitId] = useState<string | null>(null);

  // 이스터에그 상태
  const [easterEggStep, setEasterEggStep] = useState(0);
  const [showEasterEggModal, setShowEasterEggModal] = useState(false);
  const [pendingAuthor, setPendingAuthor] = useState('');

  // 이전 크롤링 상태를 추적하기 위한 ref
  const prevIsCrawlingRef = useRef(false);
  // 마지막으로 크롤링한 브랜치 추적
  const lastCrawledRef = useRef<{ uuid: string; branch: string } | null>(null);

  useEffect(() => {
    if (uuid) {
      console.log('[Main] UUID changed:', uuid);
      // 상태 초기화
      setCommits([]);
      setAuthors([]);
      setSelectedAuthor('');
      setFileNameFilter('');
      setBranches([]);
      setSelectedBranch('');
      setIsCrawling(false);
      prevIsCrawlingRef.current = false;
      lastCrawledRef.current = null; // 크롤링 이력 초기화
      setLastClickedCommitId(null); // 마지막 클릭 커밋 초기화
      // 브랜치 로드 요청
      window.electron.ipcRenderer.sendMessage('get-branches', uuid);
    }
  }, [uuid]);

  useEffect(() => {
    if (uuid && selectedBranch) {
      loadCommits();
    }
  }, [selectedAuthor, fileNameFilter, selectedBranch, uuid]);

  const handleBranchChange = (branchName: string) => {
    if (branchName !== selectedBranch) {
      // 브랜치 변경 시 크롤링 이력 초기화하여 새로 크롤링하도록
      lastCrawledRef.current = null;
      setLastClickedCommitId(null); // 브랜치 변경 시 마지막 클릭 커밋 초기화
      setSelectedBranch(branchName);
    }
  };

  // IPC 리스너 등록 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
    console.log('[Main] Registering IPC listeners');

    // 브랜치 목록 수신
    const unsubBranches = window.electron.ipcRenderer.on('get-branches', (data: any) => {
      console.log('[Main] Received branches:', data);
      if (data && data.length > 0) {
        setBranches(data);
        const defaultBranch = data.find((b: Branch) => b.isDefault);
        const branchToSelect = defaultBranch?.name || data[0].name;
        console.log('[Main] Setting selected branch to:', branchToSelect);
        setSelectedBranch(branchToSelect);
      } else {
        setBranches([{ name: 'master', isDefault: true }]);
        setSelectedBranch('master');
      }
    });

    // 크롤링 진행 상황 수신
    const unsubProgress = window.electron.ipcRenderer.on('crawl-progress', (data: any) => {
      console.log('[Main] Crawl progress:', data);
      setCrawlProgress({
        current: data.current,
        total: data.total,
        phase: data.phase,
        message: data.message
      });
    });

    // 커밋 크롤링 결과 수신
    const unsubCrawl = window.electron.ipcRenderer.on('crawl-commits', (result: any) => {
      console.log('[Main] Crawl result:', result);
      setIsCrawling(false);
      setCrawlProgress(null);

      // 크롤링 완료 직후 데이터 로드
      if (result && result.uuid && result.branch) {
        console.log('[Main] Crawl completed, loading data for:', result);

        // 작성자 로드
        window.electron.ipcRenderer.sendMessage('get-authors-from-db', {
          uuid: result.uuid,
          branch: result.branch
        });

        // 커밋 로드
        window.electron.ipcRenderer.sendMessage('get-commits-from-db', {
          uuid: result.uuid,
          branch: result.branch
        });
      }
    });

    return () => {
      console.log('[Main] Cleaning up IPC listeners');
      if (unsubBranches) unsubBranches();
      if (unsubProgress) unsubProgress();
      if (unsubCrawl) unsubCrawl();
    };
  }, []);

  // 브랜치 선택 시 커밋 크롤링 시작
  useEffect(() => {
    if (!uuid || !selectedBranch) {
      console.log('[Main] Skipping crawl - missing uuid or branch:', { uuid, selectedBranch });
      return;
    }

    // 이미 같은 uuid와 branch로 크롤링 중이거나 완료했으면 스킵
    if (lastCrawledRef.current?.uuid === uuid && lastCrawledRef.current?.branch === selectedBranch) {
      console.log('[Main] Already crawled this combination, skipping');
      return;
    }

    if (isCrawling) {
      console.log('[Main] Already crawling, skipping');
      return;
    }

    console.log(`[Main] Starting crawl for branch: ${selectedBranch}`);
    setIsCrawling(true);
    lastCrawledRef.current = { uuid, branch: selectedBranch };

    window.electron.ipcRenderer.sendMessage('crawl-commits', {
      uuid,
      branch: selectedBranch
    });
  }, [selectedBranch, uuid]);

  // isCrawling 상태 추적 (prevIsCrawlingRef 업데이트용)
  useEffect(() => {
    prevIsCrawlingRef.current = isCrawling;
  }, [isCrawling]);

  // 작성자 및 커밋 목록 IPC 리스너 (한 번만 등록)
  useEffect(() => {
    const unsubAuthors = window.electron.ipcRenderer.on('get-authors-from-db', (data: any) => {
      console.log('[Main] Received authors:', data);
      if (data && data.length > 0) {
        setAuthors(data);
      } else {
        setAuthors([]);
      }
    });

    const unsubCommits = window.electron.ipcRenderer.on('get-commits-from-db', (data: any) => {
      console.log('[Main] Received commits:', data ? data.length : 0, 'commits');
      if (data && data.length > 0) {
        setCommits(data);
      } else {
        console.log('[Main] No commits received, setting empty array');
        setCommits([]);
      }
    });

    return () => {
      if (unsubAuthors) unsubAuthors();
      if (unsubCommits) unsubCommits();
    };
  }, []);

  const loadAuthors = () => {
    if (!uuid || !selectedBranch) {
      console.log('[loadAuthors] Skipping - missing uuid or branch:', { uuid, selectedBranch });
      return;
    }

    console.log('[loadAuthors] Requesting authors for branch:', selectedBranch);
    window.electron.ipcRenderer.sendMessage('get-authors-from-db', {
      uuid,
      branch: selectedBranch
    });
  };

  const loadCommits = () => {
    if (!uuid || !selectedBranch) {
      console.log('[loadCommits] Skipping - missing uuid or branch:', { uuid, selectedBranch });
      return;
    }

    console.log('[loadCommits] Requesting commits for:', { uuid, branch: selectedBranch, fileName: fileNameFilter, author: selectedAuthor });
    window.electron.ipcRenderer.sendMessage('get-commits-from-db', {
      uuid,
      fileName: fileNameFilter || undefined,
      author: selectedAuthor || undefined,
      branch: selectedBranch
    });
  };


  const handleCommitClick = (commit: Commit) => {
    setLastClickedCommitId(commit.commit_id);
    setSelectedCommit(commit);
    setIsLoadingDetail(true);

    // 먼저 DB에서 조회
    window.electron.ipcRenderer.sendMessage('get-commit-detail-from-db', commit.commit_id);

    // 기존 리스너 제거 후 새로 등록
    const handleDetailFromDB = (data: any) => {
      if (data && data.length > 0) {
        // DB에 있으면 바로 표시
        setCommitFiles(data);
        setShowModal(true);
        setIsLoadingDetail(false);
      } else {
        // DB에 없으면 크롤링
        console.log('Commit detail not in DB, crawling...');
        window.electron.ipcRenderer.sendMessage('crawl-commit-detail', {
          uuid,
          commitId: commit.commit_id,
          branch: selectedBranch
        });

        const handleCrawlDetail = (detail: any) => {
          if (detail && detail.files) {
            // 크롤링한 데이터를 DB에 저장
            const files = detail.files.map((file: any) => ({
              commit_id: commit.commit_id,
              commit_file: file.path,
              commit_content: file.diff
            }));
            setCommitFiles(files);
            setShowModal(true);
            setIsLoadingDetail(false);
          } else {
            setIsLoadingDetail(false);
          }
        };

        // 일회성 리스너 등록
        window.electron.ipcRenderer.once('crawl-commit-detail', handleCrawlDetail);
      }
    };

    // 일회성 리스너 등록
    window.electron.ipcRenderer.once('get-commit-detail-from-db', handleDetailFromDB);
  };

  const handleFileClick = (file: CommitFile) => {
    setSelectedFile(file);
  };

  const handleAuthorChange = (author: string) => {
    const easterEggNames = ['KYH', '김영환', 'KimYounghwan8750', 'KimYoungHwan8750'];

    if (easterEggNames.includes(author)) {
      setPendingAuthor(author);
      setEasterEggStep(1);
      setShowEasterEggModal(true);
    } else {
      setSelectedAuthor(author);
    }
  };

  const handleEasterEggConfirm = () => {
    if (easterEggStep === 1) {
      setEasterEggStep(2);
    } else if (easterEggStep === 2) {
      setEasterEggStep(3);
    } else if (easterEggStep === 3) {
      setEasterEggStep(4);
    } else if (easterEggStep === 4) {
      setShowEasterEggModal(false);
      setEasterEggStep(0);
      setSelectedAuthor(pendingAuthor);
      setPendingAuthor('');
    }
  };

  const handleEasterEggCancel = () => {
    setShowEasterEggModal(false);
    setEasterEggStep(0);
    setPendingAuthor('');
    setSelectedAuthor('');
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

  // 프로젝트 선택하지 않았을 때
  if (!uuid) {
    return (
      <Container>
        <EmptyState>
          <EmptyIcon>📁</EmptyIcon>
          <EmptyTitle>프로젝트를 선택해주세요</EmptyTitle>
        </EmptyState>
      </Container>
    );
  }

  // 로딩 중일 때
  if (isCrawling) {
    return (
      <Container>
        <LoadingOverlay>
          <LoadingSpinner />
          <LoadingText>커밋 정보를 불러오는 중입니다...</LoadingText>
          {crawlProgress && (
            <LoadingSubText>
              {crawlProgress.message || (
                crawlProgress.total
                  ? `${crawlProgress.current-1} / ${crawlProgress.total} 페이지`
                  : crawlProgress.current === 1
                    ? '페이지 정보 확인 중...'
                    : `${crawlProgress.current} 페이지 처리 중...`
              )}
            </LoadingSubText>
          )}
          {!crawlProgress && <LoadingSubText>잠시만 기다려주세요</LoadingSubText>}
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
              onChange={(e) => handleBranchChange(e.target.value)}
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
              onChange={(e) => handleAuthorChange(e.target.value)}
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
            <CommitItem
              key={commit.commit_id}
              onClick={() => handleCommitClick(commit)}
              $isLastClicked={lastClickedCommitId === commit.commit_id}
            >
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
        <Modal onClick={() => { setShowModal(false); setSelectedFile(null); setIsLoadingDetail(false); }}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{selectedCommit.commit_msg}</ModalTitle>
              <CloseButton onClick={() => { setShowModal(false); setSelectedFile(null); setIsLoadingDetail(false); }}>✕</CloseButton>
            </ModalHeader>

            <ModalBody>
              {isLoadingDetail ? (
                <LoadingMessage>
                  <ModalLoadingSpinner />
                  <div>커밋 상세 정보를 불러오는 중...</div>
                </LoadingMessage>
              ) : !selectedFile ? (
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
                    {commitFiles.map((file, idx) => {
                      const isHighlighted = !!(fileNameFilter &&
                        file.commit_file.toLowerCase().includes(fileNameFilter.toLowerCase()));
                      return (
                        <FileItem
                          key={idx}
                          onClick={() => handleFileClick(file)}
                          $highlighted={isHighlighted}
                        >
                          📄 {file.commit_file}
                        </FileItem>
                      );
                    })}
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

      {showEasterEggModal && (
        <EasterEggOverlay onClick={easterEggStep === 4 ? undefined : handleEasterEggCancel}>
          <EasterEggModal onClick={(e) => e.stopPropagation()}>
            <EasterEggIcon>
              {easterEggStep === 4 ? '✅' : '🤔'}
            </EasterEggIcon>
            <EasterEggTitle>
              {easterEggStep === 1 && '제가 만든 프로그램으로 제 실수를 찾아내시겠습니까?'}
              {easterEggStep === 2 && '정말로 검색하시겠습니까?'}
              {easterEggStep === 3 && '이 사실에 대해 인지하고 계십니까?'}
              {easterEggStep === 4 && '알겠습니다. 탐색을 시작하겠습니다.'}
            </EasterEggTitle>
            <EasterEggSubtitle>
              {easterEggStep === 1 && '이는 매우 서운할 수 있습니다. 계속하시겠습니까?'}
              {easterEggStep === 2 && ''}
              {easterEggStep === 3 && '제가 작성한 코드에는 어떠한 악의도 없었으며 고의성도 없습니다.'}
              {easterEggStep === 4 && ''}
            </EasterEggSubtitle>
            <EasterEggButtonGroup>
              {easterEggStep === 1 && (
                <>
                  <EasterEggButton onClick={handleEasterEggConfirm}>예</EasterEggButton>
                  <EasterEggButton $secondary onClick={handleEasterEggCancel}>아니오</EasterEggButton>
                </>
              )}
              {easterEggStep === 2 && (
                <>
                  <EasterEggButton $small onClick={handleEasterEggConfirm}>예</EasterEggButton>
                  <EasterEggButton $secondary onClick={handleEasterEggCancel}>아니오</EasterEggButton>
                </>
              )}
              {easterEggStep === 3 && (
                <>
                  <EasterEggButton onClick={handleEasterEggConfirm}>예</EasterEggButton>
                  <EasterEggButton $secondary $small onClick={handleEasterEggCancel}>아니오</EasterEggButton>
                </>
              )}
              {easterEggStep === 4 && (
                <EasterEggButton onClick={handleEasterEggConfirm}>확인</EasterEggButton>
              )}
            </EasterEggButtonGroup>
          </EasterEggModal>
        </EasterEggOverlay>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
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
  min-height: 0;
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

const CommitItem = styled.div<{ $isLastClicked?: boolean }>`
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid ${props => props.$isLastClicked ? '#ffd700' : '#e0e0e0'};
  border-width: ${props => props.$isLastClicked ? '2px' : '1px'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.$isLastClicked ? '#ffd700' : '#667eea'};
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

const FileItem = styled.div<{ $highlighted?: boolean }>`
  padding: 12px;
  background: ${props => props.$highlighted ? '#fff9c4' : '#f8f9fa'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid ${props => props.$highlighted ? '#ffd54f' : 'transparent'};
  font-weight: ${props => props.$highlighted ? '600' : 'normal'};

  &:hover {
    background: ${props => props.$highlighted ? '#ffeb3b' : '#667eea'};
    color: ${props => props.$highlighted ? '#000' : 'white'};
    border-color: ${props => props.$highlighted ? '#ffc107' : '#667eea'};
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

const LoadingMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
  font-size: 16px;
  gap: 20px;
`;

const ModalLoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #ffffff 100%);
`;

const EmptyIcon = styled.div`
  font-size: 80px;
  margin-bottom: 24px;
  opacity: 0.6;
`;

const EmptyTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin: 0 0 16px 0;
`;

const EmptyDescription = styled.p`
  font-size: 16px;
  color: #666;
  text-align: center;
  line-height: 1.6;
  margin: 0;
`;

const EasterEggOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const EasterEggModal = styled.div`
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      transform: translateY(30px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const EasterEggIcon = styled.div`
  font-size: 64px;
`;

const EasterEggTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  text-align: center;
  margin: 0;
  line-height: 1.5;
`;

const EasterEggSubtitle = styled.p`
  font-size: 16px;
  color: #666;
  text-align: center;
  margin: 0;
  line-height: 1.5;
`;

const EasterEggButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 12px;
`;

const EasterEggButton = styled.button<{ $secondary?: boolean; $small?: boolean }>`
  padding: ${props => props.$small ? '2px 8px' : '12px 32px'};
  height: ${props => props.$small ? '20px' : 'auto'};
  font-size: ${props => props.$small ? '10px' : '15px'};
  font-weight: 600;
  border: none;
  border-radius: ${props => props.$small ? '4px' : '8px'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  ${props => props.$secondary ? `
    background: #f0f0f0;
    color: #666;

    &:hover {
      background: #e0e0e0;
    }
  ` : `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  `}

  &:active {
    transform: translateY(0);
  }
`;

export default Main;
