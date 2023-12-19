import React, { FC, useEffect, useState } from 'react';
import { useRouteLoaderData } from 'react-router-dom';
import styled from 'styled-components';

import { getCommonHeaderNames, getCommonHeaderValues } from '../../../../common/common-headers';
import { DEFAULT_PANE_WIDTH } from '../../../../common/constants';
import { metaSortKeySort } from '../../../../common/sorting';
import { Environment } from '../../../../models/environment';
import { REQUEST_DATASET_SETTING_COLLAPSE, RequestDataSet } from '../../../../models/request-dataset';
import { Button } from '../../../components/themed-button';
import { useRootLoaderData } from '../../../routes/root';
import { WorkspaceLoaderData } from '../../../routes/workspace';
import { Editable } from '../../base/editable';
import { PromptButton } from '../../base/prompt-button';
import { KeyValueEditor } from '../../key-value-editor/key-value-editor';
import { SvgIcon } from '../../svg-icon';
import { ChooseEnvironmentsDropdown } from './choose-environments-dropdown';

interface Props {
  dataset: RequestDataSet;
  isBaseDataset: boolean;
  onChanged: (dataset: RequestDataSet) => void;
  onDeleteDataset?: (dataset: RequestDataSet) => void;
  onPromoteToDefault?: (dataset: RequestDataSet) => void;
  onDuplicate?: (dataset: RequestDataSet) => void;
  onSendWithDataset?: (dataset: RequestDataSet) => void;
  onGenerateCodeWithDataset?: (dataset: RequestDataSet) => void;
  onToggleChanged?: (dataset: RequestDataSet, toggle: boolean) => void;
}

const StyledResultListItem = styled.li`
  padding: 0 var(--padding-sm);

  > div:first-of-type {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto auto auto auto auto auto;
    padding: var(--padding-xs) 0;
  }

  svg {
    fill: var(--hl-xl);
  }

  h2 {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-normal);
    margin: 0px;
    padding-top: 5px;
  }

  button {
    padding: 0px var(--padding-xs);
  }
`;

const StyledKeyPairSpliterContainer = styled.div`
  position: relative;
  > .spliter {
    position: absolute;
    top: 15px;
    bottom: calc(
      var(--padding-md) + var(--padding-sm) + var(--padding-sm) +
        var(--line-height-xs)
    );
    border-left: 2px solid var(--hl-md);
    overflow: visible;
    cursor: ew-resize;
    z-index: 9;
    width: var(--drag-width);

    > i {
      position: absolute;
      top: -23px;
      left: -12.5px;
      color: var(--hl-md);
      cursor: pointer;
      padding: var(--padding-xs);
    }
  }
  .width-evaluater {
    position: absolute;
    height: 0;
    width: calc(
      100% - var(--line-height-sm) - 1.1rem - (var(--padding-xs) * 2) -
        var(--padding-sm)
    );
    left: var(--line-height-sm);
  }
`;

const datasetPaneWidth = DEFAULT_PANE_WIDTH; // temporarily hardcode

const DatasetRowEditor: FC<Props> = ({
  dataset,
  onChanged,
  isBaseDataset,
  onToggleChanged,
  onDeleteDataset,
  onSendWithDataset,
  onGenerateCodeWithDataset,
  onPromoteToDefault,
  onDuplicate,
}) => {
  const {
    activeEnvironment: globalActiveEnvironment,
    activeWorkspace,
    baseEnvironment,
    subEnvironments,
  } = useRouteLoaderData(':workspaceId') as WorkspaceLoaderData;
  const { settings } = useRootLoaderData();
  const [isToggled, setIsToggled] = useState(false);
  const [datasetName, setDatasetName] = useState('');
  const [datasetKey, setDatasetKey] = useState(0);
  const [activeEnvironment, setActiveEnvironment] = useState<Environment>();
  const [baseDataset, setBaseDataset] = useState<
    {
      id: string;
      metaSortKey: number;
      name: string;
      value: string;
      description: string;
      multiline: boolean;
      type: string;
    }[]
  >();

  const toggleIconRotation = -90;
  const environments = [baseEnvironment, ...subEnvironments];
  // const isPercentageType = datasetPaneWidthType === DATASET_WIDTH_TYPE_PERCENTAGE;
  // const isFixedType = datasetPaneWidthType === DATASET_WIDTH_TYPE_FIX_LEFT;
  const isPercentageType = true;
  const isFixedType = true;

  const spliterStyle: React.CSSProperties = {};
  if (isPercentageType) {
    spliterStyle.left = `calc((100% - var(--line-height-sm) - 3.4rem - (var(--padding-xs) * 2) - var(--padding-sm)) * ${datasetPaneWidth} + var(--line-height-sm))`;
  } else {
    spliterStyle.left = `calc(${datasetPaneWidth}px + var(--line-height-sm))`;
  }

  useEffect(() => {
    const datasetList = Object.keys(dataset.environment)
      .map(k => ({
        _id: k,
        id: k,
        name: dataset.environment[k].name,
        metaSortKey: dataset.environment[k].metaSortKey,
        value: dataset.environment[k].value,
        description: dataset.environment[k].description,
        multiline: dataset.environment[k].multiline,
        type: 'text',
      }))
      .sort(metaSortKeySort);
    let isToggled = false;
    if (dataset.settings) {
      isToggled = dataset.settings[REQUEST_DATASET_SETTING_COLLAPSE] || false;
    }
    setIsToggled(isToggled);
    setBaseDataset(datasetList);
    setDatasetName(dataset.name);
    setActiveEnvironment(activeEnvironment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isBaseDataset && (dataset as any).new) {
      const datasetList = Object.keys(dataset.environment)
        .map(k => ({
          _id: k,
          id: k,
          name: dataset.environment[k].name,
          metaSortKey: dataset.environment[k].metaSortKey,
          value: dataset.environment[k].value,
          description: dataset.environment[k].description,
          multiline: dataset.environment[k].multiline,
          type: 'text',
        }))
        .sort(metaSortKeySort);
      setBaseDataset(datasetList);
      setDatasetName(dataset.name);
      setDatasetKey(prevDatasetKey => prevDatasetKey + 1);
    }
  }, [dataset, isBaseDataset]);

  const handleKeyValueUpdate = (datasetList: any[]) => {
    dataset.environment = datasetList.reduce((obj, ds, i) => {
      ds.metaSortKey = i;
      obj[ds.id] = {
        name: ds.name,
        description: ds.description,
        value: ds.value,
        metaSortKey: ds.metaSortKey,
        multiline: ds.multiline,
      };
      return obj;
    }, {});
    onChanged(dataset);
    setBaseDataset(datasetList);
  };

  const toggle = () => {
    onToggleChanged && onToggleChanged(dataset, !isToggled);
    setIsToggled(!isToggled);
  };

  const handleOnDeleteDataset = () => {
    if (onDeleteDataset) {
      onDeleteDataset(dataset);
    }
  };

  const prepareDataset = (): RequestDataSet => {
    return Object.assign({}, dataset, {
      name: datasetName,
      environment: baseDataset?.reduce((obj, ds, i) => {
        ds.metaSortKey = i;
        obj[ds.id] = {
          name: ds.name,
          description: ds.description,
          value: ds.value,
          metaSortKey: ds.metaSortKey,
          multiline: ds.multiline,
        };
        return obj;
      }, {}),
    });
  };

  const handleOnSendWithDataset = () => {
    const thisDataset = prepareDataset();
    if (onSendWithDataset) {
      onSendWithDataset(thisDataset);
    }
  };

  const handleOnGenerateCode = () => {
    const thisDataset = prepareDataset();
    if (onGenerateCodeWithDataset) {
      onGenerateCodeWithDataset(thisDataset);
    }
  };

  const changeDatasetName = (newName: string) => {
    dataset.name = newName;
    onChanged(dataset);
    setDatasetName(newName);
  };

  const handleChangeEnvironment = (environmentId: string) => {
    dataset.applyEnv = environmentId;
    onChanged(dataset);
    setActiveEnvironment(globalActiveEnvironment);
  };

  const handleOnSetDefaultDataset = () => {
    if (onPromoteToDefault) {
      onPromoteToDefault(dataset);
    }
  };

  const handleOnDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(dataset);
    }
  };

  if (isBaseDataset) {
    return (
      <StyledKeyPairSpliterContainer>
        {/* <div className="width-evaluater" ref={handleSetRequestDatasetPaneRef} />
          <div
            className="spliter"
            onMouseDown={handleStartDragDatasetPaneHorizontal}
            onDoubleClick={handleResetDragDatasetPaneHorizontal}
            style={spliterStyle}
          >
            <i
              className={classnames('fa', { 'fa-arrows-h': isPercentageType }, { 'fa-arrow-right': isFixedType })}
              // @ts-expect-error -- TSCONVERSION
              onClick={handleToggleDatasetResizeType}
            />
          </div> */}
        {baseDataset && (
          <KeyValueEditor
            namePlaceholder="data key"
            valuePlaceholder="data value"
            descriptionPlaceholder="description"
            pairs={baseDataset}
            handleGetAutocompleteNameConstants={getCommonHeaderNames}
            handleGetAutocompleteValueConstants={getCommonHeaderValues}
            onChange={handleKeyValueUpdate}
          />
        )}
      </StyledKeyPairSpliterContainer>
    );
  }

  return (
    <StyledResultListItem>
      <div>
        <Button
          onClick={toggle}
          variant="text"
          style={
            isToggled ? {} : { transform: `rotate(${toggleIconRotation}deg)` }
          }
        >
          <SvgIcon icon="chevron-down" />
        </Button>
        <Button variant="text" disabled>
          <SvgIcon icon="file" />
        </Button>
        <h2>
          <Editable
            className="block"
            onSubmit={changeDatasetName}
            value={datasetName}
          />
        </h2>
        {activeWorkspace && (
          <ChooseEnvironmentsDropdown
            handleChangeEnvironment={handleChangeEnvironment}
            activeEnvironment={activeEnvironment}
            environments={environments}
            workspace={activeWorkspace}
            hotKeyRegistry={settings.hotKeyRegistry}
          />
        )}
        <PromptButton
          key={Math.random()}
          tabIndex={-1}
          confirmMessage="Click to confirm"
          onClick={handleOnSetDefaultDataset}
          title="Set as default dataset"
        >
          <i className="fa fa-certificate" />
        </PromptButton>

        <Button variant="text" onClick={handleOnDuplicate}>
          <i className="fa fa-files-o" />
        </Button>
        <Button variant="text" onClick={handleOnGenerateCode}>
          <i className="fa fa-code" />
        </Button>
        <PromptButton
          key={Math.random()}
          tabIndex={-1}
          confirmMessage="Click to confirm"
          onClick={handleOnDeleteDataset}
          title="Delete dataset"
        >
          <i className="fa fa-trash-o" />
        </PromptButton>

        <Button variant="text" onClick={handleOnSendWithDataset}>
          <SvgIcon icon="play" />
        </Button>
      </div>

      {isToggled && (
        <div>
          {baseDataset?.length && (
            <KeyValueEditor
              key={datasetKey}
              namePlaceholder="data key"
              valuePlaceholder="data value"
              descriptionPlaceholder="description"
              pairs={baseDataset}
              allowMultiline
              handleGetAutocompleteNameConstants={getCommonHeaderNames}
              handleGetAutocompleteValueConstants={getCommonHeaderValues}
              onChange={handleKeyValueUpdate}
            />
          )}
          {!baseDataset?.length && <span>Update base dataset first</span>}
        </div>
      )}
    </StyledResultListItem>
  );
};

export default DatasetRowEditor;
