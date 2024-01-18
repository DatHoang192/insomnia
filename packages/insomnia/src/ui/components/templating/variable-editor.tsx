import React, { FC, useEffect, useState } from 'react';
import styled from 'styled-components';

import { generateId } from '../../../common/misc';
import { Workspace } from '../../../models/workspace';
import { getFilterDefinitions, getTestDefinitions } from '../../../templating';
import {
  ArgumentValue,
  ParsedFilter,
  ParsedVariableFilter,
  parseVariableAndFilter,
  stringifyVariableAndFilter,
} from '../../../templating/parser';
import { NunjucksParsedFilter } from '../../../templating/utils';
import { useNunjucks } from '../../context/nunjucks/use-nunjucks';
import FilterRowEditor, {
  AppliedNunjucksParsedFilter,
} from './filter-row-editor';

const StyledFiltersContainer = styled.ul`
  // This is the actual row
  .filter-editor__row-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
    padding-bottom: var(--padding-sm);
    box-sizing: border-box;

    &.filter-editor__row-wrapper--dragging {
      // Set opacity on children so we can still see the separator
      & > * {
        opacity: 0.2;
      }
    }

    &.filter-editor__row-wrapper--dragging-below::after,
    &.filter-editor__row-wrapper--dragging-above::before {
      position: absolute;
      height: 0;
      right: 0;
      left: 0;
      border-bottom: 2px dotted var(--color-surprise);
      content: ' ';
      display: block;
    }

    // So the line appears on the next row
    &.filter-editor__row-wrapper--dragging-below::after {
      bottom: -1px; // half border thickness
    }

    // So the line appears on the next row
    &.filter-editor__row-wrapper--dragging-above::before {
      top: -1px; // half border thickness
    }

    // Style last row the same no matter if focused or not.
    &.filter-editor__row-wrapper--clicker input {
      border-color: var(--hl-sm) !important;
    }
  }

  .filter-editor__drag {
    width: var(--line-height-sm);
    min-width: var(--line-height-sm);
    text-align: center;
    box-sizing: border-box;
    overflow: hidden;

    // Remove hover effect
    &,
    &:hover {
      color: var(--hl);
    }
  }

  .filter-header {
    width: calc(100% - var(--line-height-sm));
    min-width: 0;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    padding: 0 var(--padding-sm) 0 0;
    box-sizing: border-box;
    > h4 {
      width: 100%;
    }
  }

  .filter-arguments {
    width: 100%;
    border-bottom: 1px solid var(--hl-sm);
    padding: 0 var(--padding-lg);
  }
`;

interface Props {
  defaultValue: string;
  onChange: Function;
  workspace: Workspace;
}

export const VariableEditor: FC<Props> = ({ onChange, defaultValue }) => {
  const { handleRender, handleGetRenderContext } = useNunjucks();
  const [selected, setSelected] = useState(defaultValue);
  const [options, setOptions] = useState<
    { name: string; value: any; meta: { name: string; type: string } }[]
  >([]);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  // name state

  const [isUserChooseCustom, setIsUserChooseCustom] = useState<boolean>(false);
  const [isParseError, setIsParseError] = useState(true);
  const [parsedValue, setParsedValue] = useState<ParsedVariableFilter[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<
    AppliedNunjucksParsedFilter[]
  >([]);
  const [filterDefinitions, setFilterDefinitions] = useState<
    NunjucksParsedFilter[]
  >([]);
  const [variableSource, setVariableSource] = useState('');

  const [rawData, setRawData] = useState<string | ParsedVariableFilter[]>(
    defaultValue
  );
  const [isUserChangeToCustom, setIsUserChangeToCustom] = useState<
    boolean | null
  >(null);
  const [filterTests, setFilterTests] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    let parsedData;
    let value = '';
    let parsedError = isParseError;
    const syncInterpolation = async () => {
      if (typeof rawData === 'string') {
        parsedData = parseVariableAndFilter(rawData);
        value = rawData;
      } else {
        parsedData = rawData;
      }

      if (parsedData) {
        value = stringifyVariableAndFilter(parsedData);
      }
      try {
        const p = await handleRender(value);
        isMounted && setPreview(p);
        isMounted && setError('');
      } catch (e) {
        isMounted && setPreview('');
        isMounted && setError(e.message);
      }
      const context = await handleGetRenderContext();
      const filterDefinitions = await getFilterDefinitions();
      const filterTests = await getTestDefinitions();

      filterDefinitions.sort(f => (f.isPlugin ? 1 : -1));
      const variables: any = context.keys.sort((a: any, b: any) => {
        if (a.meta?.type < b.meta?.type) {
          return -1;
        } else if (a.meta?.type > b.meta?.type) {
          return 1;
        } else {
          if (a.meta?.name < b.meta?.name) {
            return -1;
          } else if (a.meta?.name > b.meta?.name) {
            return 1;
          } else {
            return a.name < b.name ? -1 : 1;
          }
        }
      });
      let variableSource = '';
      const appliedFilters: AppliedNunjucksParsedFilter[] = [];
      if (parsedData) {
        const filters = parsedData.slice(1);
        const variable = parsedData[0];
        variableSource =
          context.context.getKeysContext().keyContext[variable.value as any] ||
          '';
        filters.forEach((f, i) => {
          const fd: any = filterDefinitions.find(fi => fi.name === f.name);
          if (fd) {
            appliedFilters.push({
              ...fd,
              id: generateId('filter'),
              argsValues: f.args,
              metaSort: i,
            });
          }
          return null;
        });
        parsedError = !!(parsedData.length > appliedFilters.length + 1);
      }
      if (isMounted) {
        setParsedValue(parsedData || []);
        setFilterTests(filterTests);
        setFilterDefinitions(
          filterDefinitions.sort(f => (f.isPlugin ? 1 : -1))
        );
        setAppliedFilters(appliedFilters);
        typeof isUserChangeToCustom === 'boolean' &&
          setIsUserChooseCustom(isUserChangeToCustom);
        setIsParseError(parsedError);
        setSelected(value);
        setVariableSource(variableSource);
        setOptions(variables);
        onChange(value);
      }
    };
    syncInterpolation();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserChangeToCustom, rawData, selected]);

  const isCustom = isParseError || isUserChooseCustom;
  const isRootVariable =
    !isCustom && options.find(v => parsedValue[0].value === v.name);

  const isCustomTemplateSelected = !options.find(
    v => selected === `{{ ${v.name} }}`
  );

  const selectValue = isCustom
    ? '<custom>'
    : isRootVariable
    ? parsedValue[0].value?.toString()
    : 'inline';

  const updateAppliedFilters = (
    appliedFilters: AppliedNunjucksParsedFilter[]
  ) => {
    const variable = parsedValue[0];
    const filter: ParsedFilter[] = appliedFilters.map(f => ({
      dataType: 'filter',
      name: f.name,
      args: f.argsValues,
    }));
    setRawData([variable, ...filter]);
    setIsUserChangeToCustom(null);
  };

  const handleDeleteFilter = (filter: AppliedNunjucksParsedFilter) => {
    updateAppliedFilters(appliedFilters.filter(p => p.id !== filter.id));
  };

  const handleChangeFilter = (index: number, argValues: ArgumentValue[]) => {
    const filter = appliedFilters[index];
    filter.argsValues = argValues;
    updateAppliedFilters(appliedFilters);
  };

  const renderFilterItem = (
    filter: AppliedNunjucksParsedFilter,
    index: number
  ) => {
    return (
      <FilterRowEditor
        key={index}
        filter={filter}
        index={index}
        onChange={handleChangeFilter}
        onDelete={handleDeleteFilter}
        variables={options}
        filterTests={filterTests}
      />
    );
  };

  const handleAddFilter = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const filterName = e.target.value;
    const filter = filterDefinitions.find(f => f.name === filterName);
    if (filter) {
      updateAppliedFilters([
        ...appliedFilters,
        {
          ...filter,
          argsValues:
            filter.args?.map(a => ({
              dataType: 'primitive',
              value: a.defaultValue || '',
            })) || [],
          metaSort: appliedFilters.length,
          id: generateId('filter'),
        },
      ]);
    }
  };

  const handleChangeCustom = (
    e: React.ChangeEvent<HTMLInputElement & HTMLSelectElement>
  ) => {
    const name = e.target.value;
    setRawData(name);
    setIsUserChangeToCustom(true);
  };

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLSelectElement>
      | React.ChangeEvent<HTMLInputElement>
  ) => {
    const name = e.target.value;
    if (name === '<custom>') {
      setRawData(parsedValue);
      setIsUserChangeToCustom(true);
    } else {
      const tempValue = [...parsedValue];
      tempValue[0].value = name;
      setParsedValue(tempValue);
      setRawData(parsedValue);
      setIsUserChooseCustom(false);
    }
  };

  return (
    <div>
      <div className='form-control form-control--outlined'>
        <label>
          Environment Variable
          <select value={selectValue} onChange={event => handleChange(event)}>
            <option value={'<custom>'}>-- Custom --</option>
            <option value={'inline'}>-- Local variable --</option>
            {options.map((v, i) => (
              <option key={`${i}::${v.name}`} value={v.name}>
                [{v.meta?.type?.substr(0, 3)}]({v.meta?.name}) {v.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!isCustom && !isRootVariable && (
        <div className='form-control form-control--outlined'>
          <label>
            Inline Variable
            <input
              type='text'
              defaultValue={parsedValue[0].value?.toString()}
              onChange={event => handleChange(event)}
            />
          </label>
        </div>
      )}
      {!isCustom && !!appliedFilters.length && (
        <>
          <div className='form-control form-control--outlined'>
            <label>Applied filters:</label>
          </div>
          <StyledFiltersContainer>
            {appliedFilters.map(renderFilterItem)}
          </StyledFiltersContainer>
        </>
      )}
      {!isCustom && (
        <div className='form-control form-control--outlined'>
          <label>
            Add filter
            <select value={''} onChange={handleAddFilter}>
              <option value={''}>-- Select a filter to add --</option>
              {filterDefinitions.map((v, i) => (
                <option key={`${i}::${v.name}`} value={v.name}>
                  [{v.isPlugin ? 'Plugin' : 'Builtin'}]{' '}
                  {v.displayName || v.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {isCustom && (
        <div className='form-control form-control--outlined'>
          <input
            type='text'
            defaultValue={selected}
            onChange={handleChangeCustom}
          />
        </div>
      )}
      {isCustomTemplateSelected && (
        <div className='form-control form-control--outlined'>
          <input
            type='text'
            defaultValue={selected}
            onChange={event => handleChange(event)}
          />
        </div>
      )}
      <div className='form-control form-control--outlined'>
        <label>
          Live Preview {variableSource && ` - {source: ${variableSource} }`}
          <textarea
            className={`${error ? 'danger' : ''}`}
            value={preview || error}
            readOnly
          />
        </label>
      </div>
    </div>
  );
};
