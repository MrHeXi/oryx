import React from "react";
import {useSearchParams} from "react-router-dom";
import {Accordion, Alert, Button, Card, Col, Form, Nav, Row, Spinner, Table} from "react-bootstrap";
import {useSrsLanguage} from "../components/LanguageSwitch";
import {useTranslation} from "react-i18next";
import {useErrorHandler} from "react-error-boundary";
import axios from "axios";
import {Token} from "../utils";
import PopoverConfirm from "../components/PopoverConfirm";
import {OpenAISecretSettings} from "../components/OpenAISettings";
import { saveAs } from 'file-saver';
import {SrsErrorBoundary} from "../components/SrsErrorBoundary";
import ChooseVideoSource from "../components/VideoSourceSelector";

export default function ScenarioDubbing() {
  const [searchParams] = useSearchParams();
  const [dubbingId, setDubbingId] = React.useState();

  React.useEffect(() => {
    const id = searchParams.get('dubbingId') || null;
    console.log(`?dubbingId=xxx, current=${id}, Set the dubbing project to manage.`);
    setDubbingId(id);
  }, [searchParams, setDubbingId]);

  return <>
    {!dubbingId && <ScenarioDubbingList {...{setDubbingId}}/>}
    {dubbingId && <ScenarioDubbingImpl {...{dubbingId, setDubbingId}}/>}
  </>;
}

function ScenarioDubbingList({setDubbingId}) {
  const language = useSrsLanguage();
  const {t} = useTranslation();
  const handleError = useErrorHandler();
  const [searchParams, setSearchParams] = useSearchParams();
  const [name, setName] = React.useState('My Dubbing Video');
  const [projects, setProjects] = React.useState([]);
  const [refreshNow, setRefreshNow] = React.useState();
  const [files, setFiles] = React.useState([]);

  const createDubbingProject = React.useCallback((e) => {
    e.preventDefault();

    axios.post('/terraform/v1/dubbing/create', {
      title: name, files,
    }, {
      headers: Token.loadBearerHeader(),
    }).then(res => {
      const {uuid} = res.data.data;
      searchParams.set('dubbingId', uuid); setSearchParams(searchParams);
      setDubbingId(uuid);
      console.log(`Status: Create ok, name=${name}, files=${files}, data=${JSON.stringify(res.data.data)}`);
    }).catch(handleError);
  }, [t, handleError, setDubbingId, searchParams, setSearchParams, name, files]);

  const manageProject = React.useCallback((project) => {
    const uuid = project.uuid;
    searchParams.set('dubbingId', uuid); setSearchParams(searchParams);
    setDubbingId(project.uuid);
  }, [searchParams, setSearchParams, setDubbingId]);

  const removeProject = React.useCallback((uuid) => {
    axios.post('/terraform/v1/dubbing/remove', {
      uuid: uuid,
    }, {
      headers: Token.loadBearerHeader(),
    }).then(res => {
      setRefreshNow(!refreshNow);
      console.log(`Status: Remove ok, uuid=${uuid}, data=${JSON.stringify(res.data.data)}`);
    }).catch(handleError);
  }, [handleError, refreshNow, setRefreshNow]);

  React.useEffect(() => {
    const refreshDubbingProjectsTask = () => {
      axios.post('/terraform/v1/dubbing/list', {
      }, {
        headers: Token.loadBearerHeader(),
      }).then(res => {
        const {projects} = res.data.data;
        setProjects(projects?.sort((a, b) => {
          if (a.created_at === b.created_at) return a.uuid > b.uuid ? -1 : 1;
          return a.created_at > b.created_at ? -1 : 1;
        }) || []);
        console.log(`Status: List ok, data=${JSON.stringify(res.data.data)}`);
      }).catch(handleError);
    };

    refreshDubbingProjectsTask();
    const timer = setInterval(() => refreshDubbingProjectsTask(), 3 * 1000);
    return () => {
      clearInterval(timer);
      setProjects([]);
    }
  }, [handleError, setProjects, refreshNow]);

  return (
    <Accordion defaultActiveKey={['1', '2']}>
      <React.Fragment>
        {language === 'zh' ? <>
          <Accordion.Item eventKey="0">
            <Accordion.Header>场景介绍</Accordion.Header>
            <Accordion.Body>
              <div>视频翻译，即将点播视频文件翻译为多语言的字幕和音频，主要应用于需要多语言的场景。</div>
              <p></p>
              <p>可应用的具体场景包括：</p>
              <ul>
                <li>多语言视频教程，视频支持多种不同的语言的音频和字幕。</li>
                <li>娱乐场景，多语言电影，或者多语言短视频。</li>
                <li>电商直播，多语言电商，可通过虚拟直播将多语言的视频转直播流。</li>
              </ul>
            </Accordion.Body>
          </Accordion.Item>
        </> : <>
          <Accordion.Item eventKey="0">
            <Accordion.Header>Scenario Introduction</Accordion.Header>
            <Accordion.Body>
              <div>Dubbing, or video translation involves converting on-demand video files into multilingual subtitles and audio, primarily for scenarios requiring multiple languages.</div>
              <p></p>
              <p>The specific scenarios that can be applied include:</p>
              <ul>
                <li>Multilingual video tutorials, featuring videos with audio and subtitles in various languages.</li>
                <li>Entertainment settings, such as multilingual movies or short videos.</li>
                <li>E-commerce live streaming, incorporating multilingual e-commerce, allowing for multilingual video conversion into live streams through virtual broadcasting.</li>
              </ul>
            </Accordion.Body>
          </Accordion.Item>
        </>}
      </React.Fragment>
      <Accordion.Item eventKey="1">
        <Accordion.Header>{t('dubb.create.title')}</Accordion.Header>
        <Accordion.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('dubb.create.name')}</Form.Label>
              <Form.Text> * {t('dubb.create.name2')}</Form.Text>
              <Form.Control as="input" defaultValue={name} onChange={(e) => setName(e.target.value)} />
            </Form.Group>
            <SrsErrorBoundary>
              <ChooseVideoSource vLiveFiles={files} setVLiveFiles={setFiles} hideStreamSource={true} endpoint='dubbing' />
            </SrsErrorBoundary>
            <Button ariant="primary" type="submit" onClick={(e) => createDubbingProject(e)}>
              {t('helper.create')}
            </Button>
          </Form>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="2">
        <Accordion.Header>{t('dubb.create.projects')}</Accordion.Header>
        <Accordion.Body>
          {projects?.length ? <Table striped bordered hover>
            <thead>
            <tr>
              <th>#</th>
              <th>UUID</th>
              <th>Title</th>
              <th>FileType</th>
              <th>FilePath</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
            </thead>
            <tbody>
            {projects?.map((project, index) => {
              return <tr key={project.uuid}>
                <td>{index}</td>
                <td>
                  <a href="#!" onClick={(e) => {
                    e.preventDefault();
                    manageProject(project);
                  }}>{project.uuid}</a>
                </td>
                <td>{project.title}</td>
                <td>{project.filetype}</td>
                <td>{project.filepath}</td>
                <td>{project.created_at}</td>
                <td>
                  <a href="#!" onClick={(e) => {
                    e.preventDefault();
                    manageProject(project);
                  }}>{t('helper.manage')}</a> &nbsp;
                  <PopoverConfirm placement='top' trigger={ <a href='#!'>{t('helper.delete')}</a> } onClick={() => removeProject(project.uuid)}>
                    <p>{t('dubb.create.delete')}</p>
                  </PopoverConfirm>
                </td>
              </tr>;
            })}
            </tbody>
          </Table> : t('dubb.create.empty')}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

function ScenarioDubbingImpl({dubbingId, setDubbingId}) {
  const {t} = useTranslation();
  const handleError = useErrorHandler();
  const [project, setProject] = React.useState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requesting, setRequesting] = React.useState(false);

  React.useEffect(() => {
    axios.post('/terraform/v1/dubbing/query', {
      uuid: dubbingId,
    }, {
      headers: Token.loadBearerHeader(),
    }).then(res => {
      setProject(res.data.data);
      console.log(`Project: Query ok, uuid=${dubbingId}, data=${JSON.stringify(res.data.data)}`);
    }).catch(handleError);
  }, [handleError, dubbingId, setDubbingId]);

  const updateProject = React.useCallback((project) => {
    setRequesting(true);
    try {
      new Promise(resolve => {
        axios.post('/terraform/v1/dubbing/update', {
          uuid: project.uuid, ...project,
        }, {
          headers: Token.loadBearerHeader(),
        }).then(res => {
          alert(t('helper.setOk'));
          setProject(res.data.data);
          console.log(`Project: Update ok, uuid=${project.uuid}, data=${JSON.stringify(res.data.data)}`);
          resolve();
        }).catch(handleError);
      });
    } finally {
      setRequesting(false);
    }
  }, [t, handleError, setRequesting, setProject]);

  if (!project) return <Spinner animation="border" variant="primary" />;
  const activeKeys = project?.asr?.aiProvider ? ['2'] : ['1', '2'];
  return <>
    <Accordion defaultActiveKey={activeKeys}>
      <Accordion.Item eventKey="0">
        <Accordion.Header>{t('lr.room.nav')}</Accordion.Header>
        <Accordion.Body>
          <Button variant="link" onClick={() => {
            setDubbingId(null);
            searchParams.delete('dubbingId'); setSearchParams(searchParams);
          }}>Back to Dubbing Projects</Button>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="1">
        <Accordion.Header>{t('dubb.setting.title')}</Accordion.Header>
        <Accordion.Body>
          <DubbingSettings {...{project, requesting, updateProject}} />
        </Accordion.Body>
      </Accordion.Item>
      {project?.asr?.aiProvider && <Accordion.Item eventKey="2">
        <Accordion.Header>{t('dubb.studio.title')}</Accordion.Header>
        <Accordion.Body>
          <DubbingStudioEditor {...{project}} />
        </Accordion.Body>
      </Accordion.Item>}
    </Accordion>
  </>;
}

function DubbingSettings({project, requesting, updateProject}) {
  const {t} = useTranslation();
  const language = useSrsLanguage();
  const [name, setName] = React.useState(project.title);
  const [configItem, setConfigItem] = React.useState('asr');

  const [aiSecretKey, setAiSecretKey] = React.useState();
  const [aiBaseURL, setAiBaseURL] = React.useState();
  const [aiOrganization, setAiOrganization] = React.useState();

  const [aiAsrProvider, setAiAsrProvider] = React.useState(project?.asr?.aiProvider || 'openai');
  const [aiAsrLanguage, setAiAsrLanguage] = React.useState(project?.asr?.aiAsrLanguage || language || 'en');

  const [aiTransProvider, setAiTransProvider] = React.useState(project?.trans?.aiProvider || 'openai');
  const [aiChatModel, setAiChatModel] = React.useState(project?.trans?.aiChatModel || 'gpt-4-turbo-preview');
  const [aiChatPrompt, setAiChatPrompt] = React.useState(project?.trans?.aiChatPrompt || (aiAsrLanguage === 'en' ? 'Translate all user input text into Chinese.' : 'Translate all user input text into English.'));

  const [aiRephraseProvider, setAiRephraseProvider] = React.useState(project?.rephrase?.aiProvider || 'openai');
  const [aiRephraseModel, setAiRephraseModel] = React.useState(project?.rephrase?.aiChatModel || 'gpt-4-turbo-preview');
  const [aiRephrasePrompt, setAiRephrasePrompt] = React.useState(project?.rephrase?.aiChatPrompt || 'Use the same language and do not translate. Remember to maintain original meanings. Rephrase the text shorter.');

  const [aiTtsProvider, setAiTtsProvider] = React.useState(project?.tts?.aiProvider || 'openai');

  React.useEffect(() => {
    if (!aiAsrLanguage || !aiChatPrompt) return;
    if (aiAsrLanguage === 'en' && aiChatPrompt.indexOf('English') >= 0) {
      setAiChatPrompt('Translate all user input text into Chinese.');
    } else if (aiAsrLanguage === 'zh' && aiChatPrompt.indexOf('Chinese') >= 0) {
      setAiChatPrompt('Translate all user input text into English.');
    }
  }, [aiAsrLanguage, aiChatPrompt, setAiChatPrompt]);

  React.useEffect(() => {
    let obj = null;
    if (project?.asr?.aiProvider === 'openai') {
      obj = project.asr;
    } else if (project?.trans?.aiProvider === 'openai') {
      obj = project.trans;
    } else if (project?.rephrase?.aiProvider === 'openai') {
      obj = project.rephrase;
    } else if (project?.tts?.aiProvider === 'openai') {
      obj = project.tts;
    }

    if (obj) {
      setAiSecretKey(obj.aiSecretKey);
      setAiBaseURL(obj.aiBaseURL || (language === 'zh' ? '' : 'https://api.openai.com/v1'));
      setAiOrganization(obj.aiOrganization);
    }
  }, [language, project, setAiSecretKey, setAiBaseURL, setAiOrganization]);

  const changeConfigItem = React.useCallback((e, t) => {
    e.preventDefault();
    setConfigItem(t);
  }, [setConfigItem]);

  const onUpdateProject = React.useCallback((e) => {
    e.preventDefault();
    updateProject({
      ...project,
      asr: {
        aiProvider: aiAsrProvider, aiSecretKey, aiOrganization, aiBaseURL,
        aiAsrLanguage, aiAsrEnabled: true,
        aiAsrPrompt: 'user-only',
      },
      trans: {
        aiProvider: aiTransProvider, aiSecretKey, aiOrganization, aiBaseURL,
        aiChatEnabled: true, aiChatModel, aiChatPrompt,
      },
      rephrase: {
        aiProvider: aiRephraseProvider, aiSecretKey, aiOrganization, aiBaseURL,
        aiChatEnabled: true, aiChatModel: aiRephraseModel, aiChatPrompt: aiRephrasePrompt,
      },
      tts: {
        aiProvider: aiTtsProvider, aiSecretKey, aiOrganization, aiBaseURL,
        aiTtsEnabled: true,
      }
    });
  }, [
    updateProject, project,
    // For OpenAI settings.
    aiSecretKey, aiOrganization, aiBaseURL,
    // For ASR.
    aiAsrProvider, aiAsrLanguage,
    // For Translation.
    aiTransProvider, aiChatModel, aiChatPrompt,
    // For Rephrase.
    aiRephraseProvider, aiRephraseModel, aiRephrasePrompt,
    // For TTS.
    aiTtsProvider,
  ]);

  return <>
    <Form>
      <Card>
        <Card.Header>
          <Nav variant="tabs" defaultActiveKey="#asr">
            <Nav.Item>
              <Nav.Link href="#basic" onClick={(e) => changeConfigItem(e, 'basic')}>{t('dubb.setting.basic')}</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link href="#asr" onClick={(e) => changeConfigItem(e, 'asr')}>{t('dubb.setting.asr')}</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link href="#trans" onClick={(e) => changeConfigItem(e, 'trans')}>{t('dubb.setting.trans')}</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link href="#rephrase" onClick={(e) => changeConfigItem(e, 'rephrase')}>{t('dubb.setting.rephrase')}</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link href="#tts" onClick={(e) => changeConfigItem(e, 'tts')}>{t('dubb.setting.tts')}</Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>
        {configItem === 'basic' && <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t('dubb.create.name')}</Form.Label>
            <Form.Text> * {t('dubb.create.name2')}</Form.Text>
            <Form.Control as="input" defaultValue={name} onChange={(e) => setName(e.target.value)}/>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t('plat.tool.file')}</Form.Label>
            <Form.Text> * {t('plat.tool.file2')}</Form.Text>
            <Form.Control type="text" readOnly defaultValue={project.filepath}/>
          </Form.Group>
          <Button ariant="primary" type="submit" disabled={requesting} onClick={(e) => {
            e.preventDefault();
            updateProject({...project, title: name});
          }}>
            {t('helper.update')}
          </Button>
        </Card.Body>}
        {configItem === 'asr' && <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t('lr.room.provider')}</Form.Label>
            <Form.Text> * {t('lr.room.provider2')}</Form.Text>
            <Form.Select defaultValue={aiAsrProvider} onChange={(e) => setAiAsrProvider(e.target.value)}>
              <option value="">--{t('helper.noSelect')}--</option>
              <option value="openai">OpenAI</option>
            </Form.Select>
          </Form.Group>
          <OpenAISecretSettings {...{
            baseURL: aiBaseURL, setBaseURL: setAiBaseURL,
            secretKey: aiSecretKey, setSecretKey: setAiSecretKey,
            organization: aiOrganization, setOrganization: setAiOrganization,
          }} />
          <p></p>
          <Form.Group className="mb-3">
            <Form.Label>{t('transcript.lang')}</Form.Label>
            <Form.Text> * {t('transcript.lang2')}. &nbsp;
              {t('helper.eg')} <code>en, zh, fr, de, ja, ru </code>, ... &nbsp;
              {t('helper.see')} <a href='https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes' target='_blank'
                                   rel='noreferrer'>ISO-639-1</a>.
            </Form.Text>
            <Form.Control as="input" defaultValue={aiAsrLanguage} onChange={(e) => setAiAsrLanguage(e.target.value)}/>
          </Form.Group>
          <Button ariant="primary" type="submit" disabled={requesting} onClick={onUpdateProject}>
            {t('helper.update')}
          </Button>
        </Card.Body>}
        {configItem === 'trans' && <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t('lr.room.provider')}</Form.Label>
            <Form.Text> * {t('lr.room.provider2')}</Form.Text>
            <Form.Select defaultValue={aiTransProvider} onChange={(e) => setAiTransProvider(e.target.value)}>
              <option value="">--{t('helper.noSelect')}--</option>
              <option value="openai">OpenAI</option>
            </Form.Select>
          </Form.Group>
          <OpenAISecretSettings {...{
            baseURL: aiBaseURL, setBaseURL: setAiBaseURL,
            secretKey: aiSecretKey, setSecretKey: setAiSecretKey,
            organization: aiOrganization, setOrganization: setAiOrganization,
          }} />
          <p></p>
          <Form.Group className="mb-3">
            <Form.Label>{t('lr.room.model')}</Form.Label>
            <Form.Text> * {t('lr.room.model2')}</Form.Text>
            <Form.Control as="input" type='input' defaultValue={aiChatModel} onChange={(e) => setAiChatModel(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t('lr.room.prompt')}</Form.Label>
            <Form.Text> * {t('lr.room.prompt2')}</Form.Text>
            <Form.Control as="textarea" type='text' rows={7}  defaultValue={aiChatPrompt} onChange={(e) => setAiChatPrompt(e.target.value)} />
          </Form.Group>
          <Button ariant="primary" type="submit" disabled={requesting} onClick={onUpdateProject}>
            {t('helper.update')}
          </Button>
        </Card.Body>}
        {configItem === 'rephrase' && <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t('lr.room.provider')}</Form.Label>
            <Form.Text> * {t('lr.room.provider2')}</Form.Text>
            <Form.Select defaultValue={aiRephraseProvider} onChange={(e) => setAiRephraseProvider(e.target.value)}>
              <option value="">--{t('helper.noSelect')}--</option>
              <option value="openai">OpenAI</option>
            </Form.Select>
          </Form.Group>
          <OpenAISecretSettings {...{
            baseURL: aiBaseURL, setBaseURL: setAiBaseURL,
            secretKey: aiSecretKey, setSecretKey: setAiSecretKey,
            organization: aiOrganization, setOrganization: setAiOrganization,
          }} />
          <p></p>
          <Form.Group className="mb-3">
            <Form.Label>{t('lr.room.model')}</Form.Label>
            <Form.Text> * {t('lr.room.model2')}</Form.Text>
            <Form.Control as="input" type='input' defaultValue={aiRephraseModel} onChange={(e) => setAiRephraseModel(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t('lr.room.prompt')}</Form.Label>
            <Form.Text> * {t('lr.room.prompt2')}</Form.Text>
            <Form.Control as="textarea" type='text' rows={7}  defaultValue={aiRephrasePrompt} onChange={(e) => setAiRephrasePrompt(e.target.value)} />
          </Form.Group>
          <Button ariant="primary" type="submit" disabled={requesting} onClick={onUpdateProject}>
            {t('helper.update')}
          </Button>
        </Card.Body>}
        {configItem === 'tts' && <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t('lr.room.provider')}</Form.Label>
            <Form.Text> * {t('lr.room.provider2')}</Form.Text>
            <Form.Select defaultValue={aiTtsProvider} onChange={(e) => setAiTtsProvider(e.target.value)}>
              <option value="">--{t('helper.noSelect')}--</option>
              <option value="openai">OpenAI</option>
            </Form.Select>
          </Form.Group>
          <OpenAISecretSettings {...{
            baseURL: aiBaseURL, setBaseURL: setAiBaseURL,
            secretKey: aiSecretKey, setSecretKey: setAiSecretKey,
            organization: aiOrganization, setOrganization: setAiOrganization,
          }} />
          <p></p>
          <Button ariant="primary" type="submit" disabled={requesting} onClick={onUpdateProject}>
            {t('helper.update')}
          </Button>
        </Card.Body>}
      </Card>
    </Form>
  </>;
}

function DubbingStudioEditor({project}) {
  const {t} = useTranslation();
  const handleError = useErrorHandler();
  const [requesting, setRequesting] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [startupRequesting, setStartupRequesting] = React.useState(true);
  const [allGroupReady, setAllGroupReady] = React.useState(false);
  const [task, setTask] = React.useState();
  const playerRef = React.useRef(null);
  const ttsPlayer = React.useRef(null);

  React.useEffect(() => {
    if (!playerRef || !project) return;
    const token = Token.loadBearer()?.token;
    playerRef.current.src = `/terraform/v1/dubbing/play?uuid=${project.uuid}&token=${token}`;
  }, [playerRef, project]);

  React.useEffect(() => {
    if (!task) return;

    // Whether task is done.
    setProcessing(task?.status !== 'done');

    // Whether all groups are ready to generate the artifact.
    let isAllGroupsReady = true;
    if (task?.asr_response?.groups?.length) {
      task.asr_response.groups.forEach(g => {
        if (g.free_space === undefined || g.free_space < 0) {
          isAllGroupsReady = false;
        }
      });
    } else {
      isAllGroupsReady = false;
    }
    setAllGroupReady(isAllGroupsReady);
  }, [task, setProcessing, setAllGroupReady]);

  const regenerateTaskGroup = (g) => {
    const first = g?.segments && g.segments[0];
    const last = g?.segments && g.segments[g.segments.length-1];
    if (first && last) {
      g.start = first.start;
      g.end = last.end;
      g.duration = last.end - first.start;
    }
    if (g.duration > 0 && g.tts_duration > 0) {
      g.free_space = g.duration - g.tts_duration;
    }
  }

  const startDubbingTask = React.useCallback(async (e) => {
    e && e.preventDefault();
    setRequesting(true);
    try {
      let task = await new Promise(resolve => {
        axios.post('/terraform/v1/dubbing/task-start', {
          uuid: project.uuid,
        }, {
          headers: Token.loadBearerHeader(),
        }).then(res => {
          setTask(res.data.data);
          console.log(`Project: Start dubbing task ok, uuid=${project.uuid}, task=${res.data.data.uuid}, data=${JSON.stringify(res.data.data)}`);
          resolve(res.data.data);
        }).catch(handleError);
      });

      let timeout = 0.5;
      do {
        task = await new Promise(resolve => {
          axios.post('/terraform/v1/dubbing/task-query', {
            uuid: project.uuid, task: task.uuid,
          }, {
            headers: Token.loadBearerHeader(),
          }).then(res => {
            const task = res.data.data;
            if (task?.asr_response?.groups) {
              task.asr_response.groups.forEach(g => {
                regenerateTaskGroup(g);
              });
            }
            setTask(task);
            console.log(`Project: Query dubbing task ok, uuid=${project.uuid}, task=${task.uuid}, data=${JSON.stringify(res.data.data)}`, task);
            resolve(res.data.data);
          }).catch(handleError);
        });

        timeout = Math.min(3, timeout * 2);
        await new Promise(resolve => setTimeout(resolve, timeout * 1000));
      } while (task.status !== 'done');
    } finally {
      setRequesting(false);
    }
  }, [handleError, setRequesting, project, setTask]);

  const downloadArtifact = React.useCallback(async (e, taskUUID) => {
    e.preventDefault();
    setRequesting(true);
    try {
      await new Promise(resolve => {
        axios.post('/terraform/v1/dubbing/export', {
          uuid: project.uuid, task: taskUUID,
        }, {
          headers: Token.loadBearerHeader(),
          responseType: 'blob',
        }).then(res => {
          const blob = new Blob([res.data], { type: 'video/mp4' });
          saveAs(blob, `dubbing-${new Date().toISOString()}.mp4`);
          console.log(`Project: Dubbing download ok, uuid=${project.uuid}`);
          resolve();
        }).catch(handleError);
      });
    } finally {
      setRequesting(false);
    }
  }, [setRequesting, handleError, project, saveAs]);

  const formatDuration = React.useCallback((duration) => {
    let hours = Math.floor(duration / 3600);
    let minutes = Math.floor((duration - (hours * 3600)) / 60);
    let seconds = duration - (hours * 3600) - (minutes * 60);
    let milliseconds = Math.round((seconds % 1) * 1000);

    hours = hours < 10 ? "0"+hours : parseInt(hours);
    minutes = minutes < 10 ? "0"+minutes : parseInt(minutes);
    seconds = seconds < 10 ? "0"+parseInt(seconds) : parseInt(seconds);
    milliseconds = milliseconds < 100 ? (milliseconds < 10 ? "00"+parseInt(milliseconds) : "0" + parseInt(milliseconds)) : parseInt(milliseconds);

    return hours+':'+minutes+':'+seconds+'.'+milliseconds;
  }, []);

  const playSegemnt = React.useCallback((e, segment) => {
    if (segment.start === null || segment.start === undefined) return alert('Segment start is null');

    const isPlayingCurrentSegment = playerRef.current.currentTime >= segment.start && playerRef.current.currentTime <= segment.end;
    if (playerRef.current.paused || !isPlayingCurrentSegment) {
      playerRef.current.currentTime = segment.start;
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [playerRef]);

  const rephraseGroup = React.useCallback(async (e, taskUUID, group) => {
    e.preventDefault();
    setRequesting(true);
    try {
      await new Promise(resolve => {
        axios.post('/terraform/v1/dubbing/task-rephrase', {
          uuid: project.uuid, task: taskUUID, group: group.uuid,
        }, {
          headers: Token.loadBearerHeader(),
        }).then(res => {
          const task = res.data.data;
          if (task?.asr_response?.groups) {
            task.asr_response.groups.forEach(g => {
              regenerateTaskGroup(g);
            });
          }
          setTask(task);
          console.log(`Project: Dubbing rephrase group ok, uuid=${project.uuid}, data=${JSON.stringify(res.data.data)}`);
          resolve();
        }).catch(handleError);
      });
    } finally {
      setRequesting(false);
    }
  }, [setRequesting, handleError, project, setTask]);

  const mergeToGroup = React.useCallback(async (e, taskUUID, group, direction) => {
    e.preventDefault();
    setRequesting(true);
    try {
      await new Promise(resolve => {
        axios.post('/terraform/v1/dubbing/task-merge', {
          uuid: project.uuid, task: taskUUID, group: group.uuid, direction,
        }, {
          headers: Token.loadBearerHeader(),
        }).then(res => {
          const task = res.data.data;
          if (task?.asr_response?.groups) {
            task.asr_response.groups.forEach(g => {
              regenerateTaskGroup(g);
            });
          }
          setTask(task);
          console.log(`Project: Dubbing merge group ok, uuid=${project.uuid}, data=${JSON.stringify(res.data.data)}`);
          resolve();
        }).catch(handleError);
      });
    } finally {
      setRequesting(false);
    }
  }, [setRequesting, handleError, project, setTask]);

  const playGroup = React.useCallback((e, group) => {
    if (!ttsPlayer || !project) return;
    if (!group.tts_duration) return alert(`Group ${group.id} no tts file`);

    const token = Token.loadBearer()?.token;
    ttsPlayer.current.src = `/terraform/v1/dubbing/task-tts?uuid=${project.uuid}&group=${group.uuid}&token=${token}`;
    ttsPlayer.current.play();
  }, [ttsPlayer, project]);

  // Automatically start dubbing task.
  React.useEffect(() => {
    if (!project?.task) return;

    const pfn = async() => {
      try {
        startDubbingTask && await startDubbingTask();
      } finally {
        setStartupRequesting(false);
      }
    };
    pfn();
  }, [project, startDubbingTask, setStartupRequesting]);

  const selectVariant = (index, g) => {
    if (g.free_space !== undefined) {
      if (g.free_space < 0.0) return 'danger';
      if (g.free_space < 0.3) return 'warning';
      if (g.free_space < 1.0) return 'primary';
      return 'success';
    }
    return 'secondary';
  };

  const hasVideo = project?.format?.has_video;
  return <>
    <Row>
      <Col xs={8}>
        <video controls={true} className={hasVideo? 'ai-dubbing-video' : 'ai-dubbing-audio'} ref={playerRef} autoPlay={false} />
        <audio ref={ttsPlayer} hidden={true}></audio>
      </Col>
      <Col>
        <p>
          <b>Title:</b> {project.title} <br/>
          <b>Created:</b> {project.created_at} <br/>
          <b>User File:</b> {project.filepath} <br/>
          <b>Source File:</b> {project.uuid}/{project.source}.{project.filepath.split('.').pop()} <br/>
          <b>Bitrate:</b> {Number(project.format.bit_rate/1000.).toFixed(1)} Kbps <br/>
          <b>Duration:</b> {Number(project.format.duration).toFixed(1)} s <br/>
        </p>
        <Row>
          {project?.video && <>
            <Col>
              <p>
                <b>Video Codec:</b> {project.video.codec_type} {project.video.codec_name} <br/>
                <b>Video Size:</b> {project.video.width} x {project.video.height} <br/>
                <b>Video Profile:</b> {project.video.profile} <br/>
                <b>Video Level:</b> {project.video.level} <br/>
              </p>
            </Col>
          </>}
          {project?.audio && <>
            <Col>
              <p>
                <b>Audio Codec:</b> {project.audio.codec_type} {project.audio.codec_name} <br/>
                <b>Profile:</b> {project.audio.profile} <br/>
                <b>SampleRate:</b> {project.audio.sample_rate} <br/>
                <b>Channels:</b> {project.audio.channels} <br/>
              </p>
            </Col>
          </>}
        </Row>
      </Col>
    </Row>
    {task?.status !== 'done' && <>
      <Button variant="primary" type="submit" disabled={requesting || processing} onClick={startDubbingTask}>
        {(requesting || processing) && <><Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true"/> &nbsp;</>}
        {t('dubb.studio.start')} {task?.status && task?.status !== 'done' && <>, status: {task?.status || 'init'}</>}
        {(requesting || processing) && <>&nbsp;...</>}
      </Button> &nbsp;
    </>}
    {!startupRequesting && task?.status === 'done' && <>
      <Button variant='primary' type='submit' disabled={requesting || processing || !allGroupReady} onClick={(e) => downloadArtifact(e, task.uuid)}>
        {(requesting || processing) && <><Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true"/> &nbsp;</>}
        {t('dubb.studio.download')}
      </Button>
    </>}
    <p></p>
    <div>
      <Row>
        <Col xs={11} className='ai-dubbing-workspace'>
          {task?.asr_response?.groups?.map((g, index) => {
            return <Card key={g.uuid} className='ai-dubbing-group'>
              <Card.Header>
                <Row>
                  <Col xs={6}>
                    <small className="text-secondary">
                      ID.{g.id}: {formatDuration(g.start)} ~ {formatDuration(g.end)}
                    </small>
                  </Col>
                  <Col xs={6} className='text-end'>
                    <>
                      <Button variant='link' size='sm' className='ai-dubbing-button' disabled={requesting}
                              onClick={(e) => rephraseGroup(e, task.uuid, g)}>
                        {t('dubb.studio.rephrase')}
                      </Button>
                    </>
                    <>
                      <Button variant='link' size='sm' className='ai-dubbing-button' disabled={requesting}
                              onClick={(e) => mergeToGroup(e, task.uuid, g, 'next')}>
                        {t('dubb.studio.mpost')}
                      </Button>
                    </>
                    {g.free_space !== undefined && <>
                      <small className="text-secondary">Free: {Number(g.free_space).toFixed(1)}s</small>
                    </>}
                  </Col>
                </Row>
              </Card.Header>
              <Alert variant={selectVariant(index, g)} className='ai-dubbing-alert'>
                {g.segments.map((s) => {
                  return <div key={s.uuid}>
                    <Row>
                      <Col xs={1} onClick={(e) => playSegemnt(e, s)} className='ai-dubbing-command'>
                        <small className="text-secondary">
                          #{s.id}: {Number(s.end - s.start).toFixed(1)}s
                        </small>
                      </Col>
                      <Col>
                        {s.text}
                      </Col>
                    </Row>
                  </div>;
                })}
              </Alert>
              <Alert variant={selectVariant(index, g)} className='ai-dubbing-alert'>
                <Row>
                  <Col xs={1} onClick={(e) => playGroup(e, g)} className='ai-dubbing-command'>
                    <small className="text-secondary">
                      #{g.id}: {Number(g.tts_duration).toFixed(1)}s
                    </small>
                  </Col>
                  <Col>
                    {g.translated}
                  </Col>
                </Row>
                {g.rephrased && g.rephrased !== g.translated && <Row>
                  <Col xs={1} onClick={(e) => playGroup(e, g)} className='ai-dubbing-command'>
                    <small className="text-secondary">
                      #{g.id}: {Number(g.tts_duration).toFixed(1)}s
                    </small>
                  </Col>
                  <Col>
                    {g.rephrased}
                  </Col>
                </Row>}
              </Alert>
            </Card>;
          })}
        </Col>
        <Col></Col>
      </Row>
    </div>
  </>;
}
