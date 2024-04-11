import React, { FC, useCallback, useEffect, useState } from 'react';
import { Button, Input, SearchField } from 'react-aria-components';
import { useRouteLoaderData } from 'react-router-dom';
import styled from 'styled-components';

import { DEBOUNCE_MILLIS } from '../../../../common/constants';
import { debounce } from '../../../../common/misc';
import * as models from '../../../../models';
import { Request } from '../../../../models/request';
import {
  REQUEST_DATASET_SETTING_COLLAPSE,
  RequestDataSet,
} from '../../../../models/request-dataset';
import { Icon } from '../../../components/icon';
import { useRequestPatcher } from '../../../hooks/use-request';
import { RequestLoaderData } from '../../../routes/request';
import { WorkspaceLoaderData } from '../../../routes/workspace';
import { showModal } from '../../modals';
import { GenerateCodeModal } from '../../modals/generate-code-modal';
import { Checkbox } from './checkbox';
import DatasetRowEditor from './dataset-row-editor';

const StyledDatasetActionsContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  > .jump-right {
    margin-left: auto;
  }
`;

interface Props {
  setLoading: (l: boolean) => void;
}

export const RequestDatasetEditor: FC<Props> = ({ setLoading }) => {
  const [baseDataset, setBaseDataset] = useState<RequestDataSet>();
  const [otherDatasets, setOtherDatasets] = useState<RequestDataSet[]>([]);
  const [renderCount, setRenderCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { activeRequest } = useRouteLoaderData(
    'request/:requestId'
  ) as RequestLoaderData;
  const { activeEnvironment } = useRouteLoaderData(
    ':workspaceId'
  ) as WorkspaceLoaderData;
  const patchRequest = useRequestPatcher();

  const addNewDataSet = async () => {
    if (baseDataset) {
      const dataset = await models.requestDataset.create({
        parentId: baseDataset.parentId,
      });
      onChange(baseDataset, [...otherDatasets, dataset]);
    }
  };

  const load = async () => {
    const baseDataset = await models.requestDataset.getOrCreateForRequest(
      activeRequest
    );
    let datasets = await models.requestDataset.findByParentId(
      activeRequest._id
    );
    datasets = datasets.filter(ds => ds._id !== baseDataset._id);
    setBaseDataset(baseDataset);
    setOtherDatasets(datasets);
  };

  const onBaseDatasetChanged = async (dataset: RequestDataSet) => {
    if (baseDataset) {
      const bdsKeys = Object.keys(dataset.environment);
      const updatedDataset = await models.requestDataset.update(baseDataset, {
        environment: dataset.environment,
      });
      const newDatasetResults = otherDatasets.map(ds => {
        const dsEnvironment = bdsKeys.reduce(
          (obj, key) =>
            Object.assign(obj, {
              [key]: Object.assign(
                {
                  value: '',
                  description: '',
                },
                ds.environment[key],
                {
                  id: key,
                  name: dataset.environment[key].name,
                  metaSortKey: dataset.environment[key].metaSortKey,
                }
              ),
            }),
          {}
        );
        (ds as any).new = true;
        return models.requestDataset.update(ds, {
          environment: dsEnvironment,
        });
      });
      let newDatasets = await Promise.all(newDatasetResults);
      newDatasets = newDatasets.map(ds => Object.assign(ds, { new: true }));
      onChange(updatedDataset, newDatasets);
    }
  };

  const onChange = (
    baseDataset: RequestDataSet,
    otherDatasets: RequestDataSet[],
    nextRenderCount?: number
  ) => {
    if (nextRenderCount !== undefined) {
      setRenderCount(nextRenderCount);
    }
    setBaseDataset(baseDataset);
    setOtherDatasets(otherDatasets);
  };

  const onDatasetChanged = async (dataset: RequestDataSet) => {
    let updatingDataset = otherDatasets.filter(
      ds => ds._id === dataset._id
    )[0];
    if (updatingDataset && baseDataset) {
      updatingDataset = await models.requestDataset.update(updatingDataset, {
        environment: dataset.environment,
        name: dataset.name,
        description: dataset.description,
        applyEnv: dataset.applyEnv,
      });
      const newDatasets = otherDatasets.map(ds =>
        ds._id === updatingDataset._id ? updatingDataset : ds
      );
      onChange(baseDataset, newDatasets);
    }
  };

  const onDeleteDataset = async (dataset: RequestDataSet) => {
    const deletingDataset = otherDatasets.filter(
      ds => ds._id === dataset._id
    )[0];
    if (deletingDataset && baseDataset) {
      await models.requestDataset.remove(deletingDataset);
      const newDatasets = otherDatasets.filter(ds => ds._id !== dataset._id);
      onChange(baseDataset, newDatasets);
    }
  };

  const handleGenerateCode = (request: Request, dataset?: RequestDataSet) => {
    showModal(GenerateCodeModal, {
      request,
      dataset,
    });
  };

  const handleGenerateCodeWithDataset = (dataset: RequestDataSet) => {
    handleGenerateCode(activeRequest, dataset);
  };

  const handleDuplicate = async (dataset: RequestDataSet) => {
    if (baseDataset) {
      const duplicatingDataset = otherDatasets.filter(
        ds => ds._id === dataset._id
      )[0];
      const duplicatedDataset = await models.requestDataset.duplicate(
        duplicatingDataset,
        {
          parentId: baseDataset.parentId,
        }
      );
      onChange(baseDataset, [...otherDatasets, duplicatedDataset]);
    }
  };

  const handlePromoteToDefault = async (dataset: RequestDataSet) => {
    let promotingDataset = otherDatasets.filter(
      ds => ds._id === dataset._id
    )[0];
    if (promotingDataset && baseDataset) {
      const promotingEnvironment = { ...promotingDataset.environment };
      const baseEnvironment = { ...baseDataset.environment };
      const baseDatasetFromModels = await models.requestDataset.update(
        baseDataset,
        {
          environment: promotingEnvironment,
        }
      );
      promotingDataset = await models.requestDataset.update(promotingDataset, {
        environment: baseEnvironment,
      });
      if (baseDatasetFromModels) {
        onChange(
          baseDatasetFromModels,
          otherDatasets.map(ds =>
            ds._id === promotingDataset._id ? { ...promotingDataset } : ds
          ),
          renderCount + 1
        );
      }
    }
  };

  const updateToggleEnvironmentFilter = () => {
    patchRequest(activeRequest._id, {
      settingDatasetFilter: !activeRequest.settingDatasetFilter,
    });
  };

  const handleToggleChanged = async (
    dataset: RequestDataSet,
    toggle: boolean
  ) => {
    let updatingDataset = otherDatasets.filter(
      ds => ds._id === dataset._id
    )[0];
    if (baseDataset && updatingDataset) {
      updatingDataset = await models.requestDataset.update(updatingDataset, {
        settings: {
          ...(updatingDataset.settings || {}),
          [REQUEST_DATASET_SETTING_COLLAPSE]: toggle,
        },
      });
      const newDatasets = otherDatasets.map(ds =>
        ds._id === updatingDataset._id ? updatingDataset : ds
      );
      onChange(baseDataset, newDatasets);
    }
  };

  const handleSearchTerm = useCallback((val: string) => setSearchTerm(val), [setSearchTerm]);

  const filterDatabsetByEnv = useCallback(
    (ds: RequestDataSet) =>
      !activeRequest.settingDatasetFilter ||
      !ds.applyEnv ||
      ds.applyEnv === activeEnvironment?._id,
    [activeEnvironment?._id, activeRequest.settingDatasetFilter]
  );

  const filterDatabsetBySearchTerm = useCallback(
    (ds: RequestDataSet) => {
      const sanitizedSearchTerm = searchTerm.trim().toLowerCase();
      return (
        ds.name.toLowerCase().includes(sanitizedSearchTerm) ||
        Object.values(ds.environment).some(dsItem =>
          dsItem.value.toLowerCase().includes(sanitizedSearchTerm)
        )
      );
    },
    [searchTerm]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pad">
      <div className="scrollable">
        <h4>Base dataset</h4>
        {baseDataset && (
          <DatasetRowEditor
            key={baseDataset._id + renderCount}
            dataset={baseDataset}
            isBaseDataset={true}
            onChanged={onBaseDatasetChanged}
            setLoading={setLoading}
          />
        )}
        <hr />

        <StyledDatasetActionsContainer className="pod pt-3">
          <button className="btn btn--clicky faint" onClick={addNewDataSet}>
            Add new dataset
          </button>
          <Checkbox
            checked={activeRequest.settingDatasetFilter}
            label={'Filter by env'}
            onChange={updateToggleEnvironmentFilter}
          />
        </StyledDatasetActionsContainer>

        <SearchField
          aria-label="Request filter"
          className="group relative flex-1 py-3"
          defaultValue=""
          onChange={debounce(handleSearchTerm, DEBOUNCE_MILLIS)}
        >
          <Input
            placeholder="Search"
            className="py-1 w-full pl-2 pr-7 rounded-sm border border-solid border-[--hl-sm] bg-[--color-bg] text-[--color-font] focus:outline-none focus:ring-1 focus:ring-[--hl-md] transition-colors"
          />
          <div className="flex items-center px-2 absolute right-0 top-0 h-full">
            <Button className="flex group-data-[empty]:hidden items-center justify-center aspect-square w-5 aria-pressed:bg-[--hl-sm] rounded-sm text-[--color-font] hover:bg-[--hl-xs] focus:ring-inset ring-1 ring-transparent focus:ring-[--hl-md] transition-all text-sm">
              <Icon icon="close" />
            </Button>
          </div>
        </SearchField>

        {otherDatasets
          .filter(filterDatabsetByEnv)
          .filter(filterDatabsetBySearchTerm)
          .map(dataset => (
            <DatasetRowEditor
              key={dataset._id + renderCount}
              onGenerateCodeWithDataset={handleGenerateCodeWithDataset}
              dataset={dataset}
              isBaseDataset={false}
              onChanged={onDatasetChanged}
              onDeleteDataset={onDeleteDataset}
              setLoading={setLoading}
              onDuplicate={handleDuplicate}
              onToggleChanged={handleToggleChanged}
              onPromoteToDefault={handlePromoteToDefault}
            />
          ))}
      </div>
    </div>
  );
};
