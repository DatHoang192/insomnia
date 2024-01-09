import React, { useRef, useState } from 'react';
import {
  useFetcher,
  useNavigate,
  useParams,
  useRouteLoaderData,
} from 'react-router-dom';

import { request } from '../../../../models';
import { isGrpcRequest } from '../../../../models/grpc-request';
import { isRequest, Request } from '../../../../models/request';
import { isWebSocketRequest } from '../../../../models/websocket-request';
import { invariant } from '../../../../utils/invariant';
import { useRequestPatcher } from '../../../hooks/use-request';
import { ProjectLoaderData } from '../../../routes/project';
import { RequestLoaderData } from '../../../routes/request';
import { CodeEditorHandle } from '../../codemirror/code-editor';
import { HelpTooltip } from '../../help-tooltip';
import { MarkdownEditor } from '../../markdown-editor';

export const RequestSettingsEditor = () => {
  const { activeRequest } = useRouteLoaderData(
    'request/:requestId'
  ) as RequestLoaderData;
  const { organizationId, projectId, workspaceId } = useParams() as {
    organizationId: string;
    projectId: string;
    workspaceId: string;
  };
  const [defaultPreviewMode, setDefaultPreviewMode] = useState<boolean>(
    !!activeRequest
  );
  const [activeWorkspaceIdToCopyTo, setActiveWorkspaceIdToCopyTo] =
    useState<string>('');
  const editorRef = useRef<CodeEditorHandle>(null);
  const patchRequest = useRequestPatcher();
  const workspacesFetcher = useFetcher();
  const navigate = useNavigate();
  const requestFetcher = useFetcher();

  const duplicateRequest = (r: Partial<Request>) =>
    requestFetcher.submit(JSON.stringify(r), {
      action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/debug/request/${activeRequest._id}/duplicate`,
      method: 'post',
      encType: 'application/json',
    });

  const toggleCheckBox = async (event: any) =>
    patchRequest(activeRequest._id, {
      [event.currentTarget.name]: !!event.currentTarget.checked,
    });

  const projectLoaderData = workspacesFetcher?.data as ProjectLoaderData;
  const workspacesForActiveProject =
    projectLoaderData?.workspaces.map(w => w.workspace) || [];

  const handleMoveToWorkspace = async () => {
    invariant(activeWorkspaceIdToCopyTo, 'Workspace ID is required');
    patchRequest(activeRequest._id, {
      parentId: activeWorkspaceIdToCopyTo,
    });
    navigate(
      `/organization/${organizationId}/project/${projectId}/workspace/${activeWorkspaceIdToCopyTo}/debug`
    );
  };

  const handleCopyToWorkspace = async () => {
    invariant(activeWorkspaceIdToCopyTo, 'Workspace ID is required');
    duplicateRequest({ parentId: activeWorkspaceIdToCopyTo });
  };

  const updateDescription = (description: string) => {
    patchRequest(activeRequest._id, { description });
    setDefaultPreviewMode(false);
  };

  const renderName = () => (
    <div className='form-control form-control--outlined'>
      <label>
        Name{' '}
        <span className='txt-sm faint italic'>
          (also rename by double-clicking in sidebar)
        </span>
        <input
          type='text'
          placeholder={activeRequest?.url || 'My Request'}
          defaultValue={activeRequest?.name}
          onChange={event =>
            patchRequest(activeRequest._id, { name: event.target.value })
          }
        />
      </label>
    </div>
  );

  const renderCheckboxes = () => (
    <>
      <div className='pad-top pad-bottom'>
        <div className='form-control form-control--thin'>
          <label>
            Apply filter dataset by active environment
            <input
              type='checkbox'
              name='settingDatasetFilter'
              checked={!!activeRequest.settingDatasetFilter}
              onChange={toggleCheckBox}
            />
          </label>
        </div>
        <div className='form-control form-control--thin'>
          <label>
            Using response visualization
            <input
              type='checkbox'
              name='settingResponseVisualize'
              checked={!!activeRequest.settingResponseVisualize}
              onChange={toggleCheckBox}
            />
          </label>
        </div>
        <div className='form-control form-control--thin'>
          <label>
            Send cookies automatically
            <input
              type='checkbox'
              name='settingSendCookies'
              checked={activeRequest.settingSendCookies}
              onChange={toggleCheckBox}
            />
          </label>
        </div>
        <div className='form-control form-control--thin'>
          <label>
            Store cookies automatically
            <input
              type='checkbox'
              name='settingStoreCookies'
              checked={activeRequest.settingStoreCookies}
              onChange={toggleCheckBox}
            />
          </label>
        </div>
        {isRequest(activeRequest) && (
          <>
            <div className='form-control form-control--thin'>
              <label>
                Automatically encode special characters in URL
                <input
                  type='checkbox'
                  name='settingEncodeUrl'
                  checked={activeRequest.settingEncodeUrl}
                  onChange={toggleCheckBox}
                />
                <HelpTooltip position='top' className='space-left'>
                  Automatically encode special characters at send time (does not
                  apply to query parameters editor)
                </HelpTooltip>
              </label>
            </div>
            <div className='form-control form-control--thin'>
              <label>
                Skip rendering of request body
                <input
                  type='checkbox'
                  name='settingDisableRenderRequestBody'
                  checked={activeRequest.settingDisableRenderRequestBody}
                  onChange={toggleCheckBox}
                />
                <HelpTooltip position='top' className='space-left'>
                  Disable rendering of environment variables and tags for the
                  request body
                </HelpTooltip>
              </label>
            </div>
            <div className='form-control form-control--thin'>
              <label>
                Rebuild path dot sequences
                <HelpTooltip position='top' className='space-left'>
                  This instructs libcurl to squash sequences of "/../" or "/./"
                  that may exist in the URL's path part and that is supposed to
                  be removed according to RFC 3986 section 5.2.4
                </HelpTooltip>
                <input
                  type='checkbox'
                  name='settingRebuildPath'
                  checked={activeRequest['settingRebuildPath']}
                  onChange={toggleCheckBox}
                />
              </label>
            </div>
          </>
        )}
      </div>
    </>
  );

  const renderRedirect = () => (
    <div className='form-control form-control--outlined'>
      <label>
        Follow redirects{' '}
        <span className='txt-sm faint italic'>(overrides global setting)</span>
        <select
          defaultValue={activeRequest.settingFollowRedirects}
          name='settingFollowRedirects'
          onChange={async event => {
            if (isWebSocketRequest(activeRequest)) {
              toggleCheckBox(event);
              return;
            } else {
              await request.update(activeRequest, {
                [event.currentTarget.name]: event.currentTarget.value,
              });
            }
          }}
        >
          <option value={'global'}>Use global setting</option>
          <option value={'off'}>Don't follow redirects</option>
          <option value={'on'}>Follow redirects</option>
        </select>
      </label>
    </div>
  );

  const renderMoveWorkspace = () => (
    <div className='form-row'>
      <div className='form-control form-control--outlined'>
        <label>
          Move/Copy to Workspace
          <HelpTooltip position='top' className='space-left'>
            Copy or move the current request to a new workspace. It will be
            placed at the root of the new workspace's folder structure.
          </HelpTooltip>
          <select
            value={activeWorkspaceIdToCopyTo}
            onChange={event => {
              setActiveWorkspaceIdToCopyTo(event.currentTarget.value);
            }}
          >
            <option value=''>-- Select Workspace --</option>
            {workspacesForActiveProject.map(w => {
              if (workspaceId === w._id) {
                return null;
              }

              return (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      <div className='form-control form-control--no-label width-auto'>
        <button
          disabled={!activeWorkspaceIdToCopyTo}
          className='btn btn--clicky'
          onClick={handleCopyToWorkspace}
        >
          Copy
        </button>
      </div>
      <div className='form-control form-control--no-label width-auto'>
        <button
          disabled={!activeWorkspaceIdToCopyTo}
          className='btn btn--clicky'
          onClick={handleMoveToWorkspace}
        >
          Move
        </button>
      </div>
    </div>
  );

  const renderGRPC = () => (
    <p className='faint italic'>
      Are there any gRPC settings you expect to see? Create a{' '}
      <a href={'https://github.com/Kong/insomnia/issues/new/choose'}>
        feature request
      </a>
      !
    </p>
  );

  return (
    <div className='pad'>
      Setting
      <div>
        <span className='txt-sm selectable faint monospace'>
          ID: {activeRequest ? activeRequest._id : ''}
        </span>
        {renderName()}
        {activeRequest &&
        (isWebSocketRequest(activeRequest) || isRequest(activeRequest)) ? (
          <>
            {/* Editor */}
            <MarkdownEditor
              ref={editorRef}
              className='margin-top'
              defaultPreviewMode={defaultPreviewMode}
              placeholder='Write a description'
              defaultValue={activeRequest.description}
              onChange={updateDescription}
            />
            {/* Checkboxes */}
            {renderCheckboxes()}
            {renderRedirect()}
            <hr />
            {renderMoveWorkspace()}
            {isGrpcRequest(activeRequest) && renderGRPC()}
          </>
        ) : null}
      </div>
    </div>
  );
};
