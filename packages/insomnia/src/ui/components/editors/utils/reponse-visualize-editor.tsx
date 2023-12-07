import React, { useCallback } from 'react';
import { useRouteLoaderData } from 'react-router-dom';
import styled from 'styled-components';

import {
  useRequestMetaPatcher,
  useRequestPatcher,
} from '../../../hooks/use-request';
import { RequestLoaderData } from '../../../routes/request';
import { RawEditor } from '../body/raw-editor';
import { Checkbox } from './checkbox';

const Container = styled.div`
  height: 100%;
  .editor-header {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    > h4 {
      padding: var(--padding-md);
      text-align: left;
      width: 100%;
    }
    > label {
      width: 180px;
    }
  }
  .editor {
    .cm-nunjucks-tag {
      padding: 2px 5px;
      border-radius: 5px;
      font-weight: bold;
    }
    .cm-nunjucks-variable {
      padding: 2px 5px;
      border-radius: 5px;
    }
    .cm-nunjucks-comment {
      color: #008000;
      padding: 2px 5px;
      border-radius: 5px;
      font-style: italic;
    }
  }
`;

export const ResponseVisualizeEditor = () => {
  const { activeRequest, activeRequestMeta } = useRouteLoaderData(
    'request/:requestId'
  ) as RequestLoaderData;
  const patchRequestMeta = useRequestMetaPatcher();
  const patchRequest = useRequestPatcher();
  const uniqueKey = `${activeRequest._id}::response-visualizer-setting`;

  const handleUpdateNunjucksPowerUserMode = useCallback(
    (value: boolean) => {
      patchRequestMeta(activeRequest._id, { visualizePowerUserMode: !value });
    },
    [activeRequest._id, patchRequestMeta]
  );

  const handleUpdateVisualization = useCallback(
    (value: boolean) => {
      patchRequest(activeRequest._id, { settingResponseVisualize: !value });
    },
    [activeRequest._id, patchRequest]
  );
  return (
    <Container>
      <div className="editor-header">
        <h4>Response visualize editor</h4>
        <Checkbox
          checked={activeRequestMeta.visualizePowerUserMode || false}
          label={'Show raw tag'}
          onChange={handleUpdateNunjucksPowerUserMode}
        />
        <Checkbox
          checked={activeRequest.settingResponseVisualize || false}
          label={'Enable visualization'}
          onChange={handleUpdateVisualization}
        />
      </div>
      <RawEditor
        onChange={rawValue => console.log(rawValue)}
        content={''}
        contentType={'xml'}
        uniquenessKey={uniqueKey}
      />
    </Container>
  );
};
