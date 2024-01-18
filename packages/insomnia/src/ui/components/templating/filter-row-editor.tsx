import React, { useState } from 'react';
import { Button } from 'react-aria-components';
import { useRouteLoaderData } from 'react-router-dom';

import { ArgumentValue } from '../../../templating/parser';
import { NunjucksParsedFilter } from '../../../templating/utils';
import { WorkspaceLoaderData } from '../../routes/workspace';
import { PromptButton } from '../base/prompt-button';
import { HelpTooltip } from '../help-tooltip';
import PluginFilterArgumentsEditor from './plugin-filter-args-editor';

export interface AppliedNunjucksParsedFilter extends NunjucksParsedFilter {
  id: string;
  argsValues: ArgumentValue[];
  metaSort: number;
}

interface Props {
  onChange: Function;
  onDelete: Function;
  index: number;
  filter: AppliedNunjucksParsedFilter;
  variables: any[];
  filterTests: string[];
}

const FilterRowEditor: React.FC<Props> = ({
  filter,
  onDelete,
  index,
  onChange,
  variables,
  filterTests,
}) => {
  const [isToggled, setIsToggled] = useState(false);

  const { activeWorkspace } = useRouteLoaderData(
    ':workspaceId'
  ) as WorkspaceLoaderData;

  const handleToggle = (e: any) => {
    e.preventDefault();
    if (filter.args?.length) {
      setIsToggled(!isToggled);
    }
  };

  const handleDelete = (e: any) => {
    e.preventDefault();
    onDelete && onDelete(filter);
  };

  const handleUpdateFilterArguments = (values: ArgumentValue[]) => {
    onChange && onChange(index, values);
  };

  const row = (
    <li className={'filter-editor__row-wrapper'}>
      <div className='filter-header'>
        {!!filter.args?.length ? (
          <Button
            onPress={() => setIsToggled(!isToggled)}
            className='space-right'
          >
            {isToggled ? (
              <i className='fa fa-chevron-down' />
            ) : (
              <i className='fa fa-chevron-right' />
            )}
          </Button>
        ) : (
          <button>
            <i className='fa fa-empty' />
          </button>
        )}

        <h4 onClick={handleToggle}>
          {filter.displayName || filter.name}{' '}
          <HelpTooltip info>{filter.description || filter.name}</HelpTooltip>
        </h4>
        <PromptButton
          key={Math.random()}
          tabIndex={-1}
          confirmMessage=''
          onClick={handleDelete}
          title='Delete item'
        >
          <i className='fa fa-trash-o' />
        </PromptButton>
      </div>
      {isToggled && (
        <div className='filter-arguments'>
          <PluginFilterArgumentsEditor
            filter={filter}
            workspace={activeWorkspace}
            variables={variables}
            filterTests={filterTests}
            onUpdate={handleUpdateFilterArguments}
          />
        </div>
      )}
    </li>
  );
  return row;
};

export default FilterRowEditor;
