import classNames from 'classnames';
import React, { useEffect, useState } from 'react';

import { database } from '../../../common/database';
import { fnOrString } from '../../../common/misc';
import { RenderKey } from '../../../common/render';
import { metaSortKeySort } from '../../../common/sorting';
import { request, requestGroup, types } from '../../../models';
import { isRequest } from '../../../models/request';
import { isRequestGroup, RequestGroup } from '../../../models/request-group';
import { Workspace } from '../../../models/workspace';
import { ArgumentValue } from '../../../templating/parser';
import {
  decodeEncoding,
  encodeEncoding,
  NunjucksParsedFilterArg,
} from '../../../templating/utils';
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownSection,
  ItemContent,
} from '../base/dropdown';
import { HelpTooltip } from '../help-tooltip';
import { AppliedNunjucksParsedFilter } from './filter-row-editor';

enum ArgumentValueType {
  Literal,
  Environment,
  Variable,
}

type NunjucksParsedFilterArgValue = NunjucksParsedFilterArg & {
  argParsedValue: ArgumentValue;
  argEditingType: ArgumentValueType;
};

interface Props {
  filter: AppliedNunjucksParsedFilter;
  workspace: Workspace;
  variables: RenderKey[];
  filterTests: string[];
  onUpdate: (values: ArgumentValue[]) => void;
}

const PluginFilterArgumentsEditor: React.FC<Props> = ({
  filter,
  variables,
  workspace,
  filterTests,
  onUpdate,
}) => {
  const { args, argsValues } = filter;
  const [allDocs, setAllDocs] = useState({});
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [argsType, setArgsType] = useState(
    !args
      ? []
      : args.map((arg, i) => {
          const a = argsValues[i];
          const thisArg = arg;
          let type = ArgumentValueType.Literal;
          if (a && a.dataType === 'variable') {
            const variable = variables.find(v => v.name === a.value);
            if (variable) {
              type = ArgumentValueType.Environment;
            } else {
              type = ArgumentValueType.Variable;
            }
          }
          return {
            ...thisArg,
            argParsedValue: a || {
              dataType: 'primitive',
              value: thisArg.defaultValue,
            },
            argEditingType: type,
            value: (!a ? thisArg.defaultValue : a.value) || '',
          };
        })
  );

  const sortRequests = (
    _models: (Request | RequestGroup)[],
    parentId: string
  ) => {
    let sortedModels: (Request | RequestGroup)[] = [];

    _models
      .filter(model => model.parentId === parentId)
      .sort(metaSortKeySort)
      .forEach(model => {
        if (isRequest(model)) {
          sortedModels.push(model);
        }
        if (isRequestGroup(model)) {
          sortedModels = sortedModels.concat(sortRequests(_models, model._id));
        }
      });

    return sortedModels;
  };

  useEffect(() => {
    setLoadingDocs(true);
    const refreshModels = async () => {
      try {
        const allDocs = {};
        for (const type of types()) {
          allDocs[type] = [];
        }

        for (const doc of await database.withDescendants(
          workspace,
          request.type
        )) {
          allDocs[doc.type].push(doc);
        }

        const requests = allDocs[request.type] || [];
        const requestGroups = allDocs[requestGroup.type] || [];

        const sortedReqs = sortRequests(
          requests.concat(requestGroups),
          workspace._id
        );

        allDocs[models.request.type] = sortedReqs;
        setAllDocs(allDocs);
      } catch (error) {
        // Handle errors
      } finally {
        setLoadingDocs(false);
      }
    };

    refreshModels();
  }, [workspace]);

  const handleChangeArgVariable = (options: {
    argIndex: number;
    type: ArgumentValueType;
  }) => {
    const { type, argIndex } = options;

    const argData = argsType[argIndex];
    const existingValue = argData.value;

    if (type === ArgumentValueType.Environment) {
      const variable = variables.find(v => v.value === existingValue);
      const firstVariable = variables.length ? variables[0].name : '';
      const value = variable ? variable.name : firstVariable;
      return updateArg(
        value || 'my_variable',
        argIndex,
        ArgumentValueType.Environment
      );
    }
    if (type === ArgumentValueType.Variable) {
      return updateArg(existingValue, argIndex, ArgumentValueType.Variable);
    } else {
      const variable = variables.find(v => v.name === existingValue);
      const value = variable ? variable.value : argData.defaultValue || '';
      return updateArg(value, argIndex, ArgumentValueType.Literal);
    }
  };

  const updateArg = async (
    argValue: string | number | boolean,
    argIndex: number,
    type: ArgumentValueType
  ) => {
    const argData = argsType[argIndex];
    // Update it
    argData.value = argValue;
    argData.argEditingType = type;
    const getDataType = (a: any) => {
      switch (a.argEditingType) {
        case ArgumentValueType.Environment:
        case ArgumentValueType.Variable:
          return 'variable';
        case ArgumentValueType.Literal:
        default:
          return 'primitive';
      }
    };
    onUpdate(argsType.map(a => ({ dataType: getDataType(a), value: a.value })));
    setArgsType([...argsType]);
  };

  const resolveRequestGroupPrefix = (
    requestGroupId: string,
    allRequestGroups: any[]
  ) => {
    let prefix = '';
    let reqGroup: any;

    do {
      // Get prefix from inner most request group.
      reqGroup = allRequestGroups.find(rg => rg._id === requestGroupId);

      if (reqGroup == null) {
        break;
      }

      const name = typeof reqGroup.name === 'string' ? reqGroup.name : '';
      prefix = `[${name}] ` + prefix;
      requestGroupId = reqGroup.parentId;
    } while (true);

    return prefix;
  };

  const handleChange = (
    e: React.SyntheticEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const parent = e.currentTarget.parentNode;
    let argIndex = -1;

    if (parent instanceof HTMLElement) {
      const index = parent && parent.getAttribute('data-arg-index');
      argIndex = typeof index === 'string' ? parseInt(index, 10) : -1;
    }

    // Handle special types
    if (e.currentTarget.getAttribute('data-encoding') === 'base64') {
      return updateArg(
        encodeEncoding(e.currentTarget.value, 'base64'),
        argIndex,
        ArgumentValueType.Literal
      );
    }

    // Handle normal types
    if (e.currentTarget.type === 'number') {
      return updateArg(
        parseFloat(e.currentTarget.value),
        argIndex,
        ArgumentValueType.Literal
      );
    } else if (e.currentTarget.type === 'checkbox') {
      return updateArg(
        e.currentTarget.checked,
        argIndex,
        ArgumentValueType.Literal
      );
    } else {
      return updateArg(
        e.currentTarget.value,
        argIndex,
        ArgumentValueType.Literal
      );
    }
  };

  const renderArgModel = (
    value: string,
    modelType: string,
    defaultSelector: string,
    defaultValue: string
  ) => {
    const id = value || 'n/a';
    if (modelType === 'nunjucks-test') {
      return (
        <select value={id} onChange={handleChange}>
          <option value={defaultValue}>{defaultSelector}</option>
          {filterTests.map((test: any, index) => {
            return (
              <option key={index} value={test}>
                {test}
              </option>
            );
          })}
        </select>
      );
    }

    const docs = allDocs[modelType] || [];

    if (loadingDocs) {
      return (
        <select disabled={loadingDocs}>
          <option>Loading...</option>
        </select>
      );
    }

    return (
      <select value={id} onChange={handleChange}>
        <option value={defaultValue}>{defaultSelector}</option>
        {docs.map((doc: any) => {
          let namePrefix: string | null = null;

          // Show parent folder with name if it's a request
          if (isRequest(doc)) {
            const requests = allDocs[request.type] || [];
            const request: any = requests.find(r => r._id === doc._id);
            const method =
              request && typeof request.method === 'string'
                ? request.method
                : 'GET';
            const parentId = request ? request.parentId : 'n/a';
            const allRequestGroups = allDocs[requestGroup.type] || [];
            const requestGroupPrefix = resolveRequestGroupPrefix(
              parentId,
              allRequestGroups
            );
            namePrefix = `${requestGroupPrefix + method} `;
          }

          const docName =
            typeof doc.name === 'string' ? doc.name : 'Unknown Request';
          return (
            <option key={doc._id} value={doc._id}>
              {namePrefix}
              {docName}
            </option>
          );
        })}
      </select>
    );
  };

  const handleChangeVariable = async (
    e: React.SyntheticEvent<HTMLInputElement | HTMLSelectElement>,
    type: ArgumentValueType
  ) => {
    const parent = e.currentTarget.parentNode;
    let argIndex = -1;

    if (parent instanceof HTMLElement) {
      const index = parent && parent.getAttribute('data-arg-index');
      argIndex = typeof index === 'string' ? parseInt(index, 10) : -1;
    }
    return updateArg(e.currentTarget.value, argIndex, type);
  };

  const handleChangeEnvironmentVariable = (
    e: React.SyntheticEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    return handleChangeVariable(e, ArgumentValueType.Environment);
  };

  const handleChangeInlineVariable = (
    e: React.SyntheticEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    return handleChangeVariable(e, ArgumentValueType.Variable);
  };

  const renderArgVariable = (path: string) => (
    <select value={path || ''} onChange={handleChangeEnvironmentVariable}>
      {variables.map((v, i) => (
        <option key={`${i}::${v.name}`} value={v.name}>
          {v.name}
        </option>
      ))}
    </select>
  );
  const renderArgInlineVariable = (
    argDefinition: NunjucksParsedFilterArgValue
  ) => (
    <input
      type='text'
      defaultValue={argDefinition.value.toString() || ''}
      placeholder={argDefinition.placeholder || ''}
      onChange={handleChangeInlineVariable}
      data-encoding={'utf8'}
    />
  );

  const renderArgString = (argDefinition: NunjucksParsedFilterArgValue) => (
    <input
      type='text'
      defaultValue={argDefinition.value.toString() || ''}
      placeholder={argDefinition.placeholder || ''}
      onChange={handleChange}
      data-encoding={'utf8'}
    />
  );

  const renderArgBoolean = (checked: boolean) => (
    <input type='checkbox' checked={checked} onChange={handleChange} />
  );

  const renderArgNumber = (argDefinition: NunjucksParsedFilterArgValue) => (
    <input
      type='number'
      defaultValue={argDefinition.value.toString() || '0'}
      placeholder={argDefinition.placeholder || ''}
      onChange={handleChange}
    />
  );

  const renderArgEnum = (
    argDefinition: NunjucksParsedFilterArgValue,
    argDatas: NunjucksParsedFilterArgValue[]
  ) => {
    const options = argDefinition.options || [];
    const value = argDefinition.value.toString();
    let unsetOption: any = null;

    if (!options.find(o => o.value === value)) {
      unsetOption = <option value=''>-- Select Option --</option>;
    }

    return (
      <select value={value} onChange={handleChange}>
        {unsetOption}
        {options.map(option => {
          let label: string;
          const { description } = option;

          if (description) {
            label = `${fnOrString(
              option.displayName,
              argDatas
            )} – ${description}`;
          } else {
            label = fnOrString(option.displayName, argDatas);
          }

          return (
            // @ts-expect-error -- TSCONVERSION boolean not accepted by option
            <option key={option.value.toString()} value={option.value}>
              {label}
            </option>
          );
        })}
      </select>
    );
  };

  const renderArg = (
    argDefinition: NunjucksParsedFilterArgValue,
    argDatas: NunjucksParsedFilterArgValue[],
    argIndex: number
  ) => {
    // Decide whether or not to show it
    if (
      typeof argDefinition.hide === 'function' &&
      argDefinition.hide(argDatas)
    ) {
      return null;
    }

    let argData: NunjucksParsedFilterArgValue;

    if (argIndex < argDatas.length) {
      argData = argDatas[argIndex];
    } else {
      return null;
    }

    if (!argData) {
      console.error('Failed to find argument to set default', {
        argDefinition,
        argDatas,
        argIndex,
      });
      return null;
    }

    const strValue = decodeEncoding(argData.value?.toString() || '');
    let argInput;
    let isVariable = false;
    let isVariableAllowed = true;
    if (argDefinition.argEditingType === ArgumentValueType.Environment) {
      isVariable = true;
      argInput = renderArgVariable(argDefinition.value.toString() || '');
    } else if (argDefinition.argEditingType === ArgumentValueType.Variable) {
      isVariable = true;
      argInput = renderArgInlineVariable(argDefinition);
    } else if (argDefinition.type === 'string') {
      argInput = renderArgString(argDefinition);
    } else if (argDefinition.type === 'boolean') {
      argInput = renderArgBoolean(
        argDefinition.value === true || argDefinition.value === 'true'
      );
    } else if (argDefinition.type === 'number') {
      argInput = renderArgNumber(argDefinition);
    } else if (argDefinition.type === 'enum') {
      isVariableAllowed = false;
      argInput = renderArgEnum(argDefinition, argDatas);
    } else if (argDefinition.type === 'model') {
      isVariableAllowed = false;
      const model =
        typeof argDefinition.model === 'string'
          ? argDefinition.model
          : 'unknown';
      const defaultSelector =
        typeof argDefinition.placeholder === 'string'
          ? argDefinition.placeholder
          : '-- Select Item --';
      const defaultValue =
        typeof argDefinition.defaultValue === 'string'
          ? argDefinition.defaultValue
          : 'n/a';
      const modelId = typeof strValue === 'string' ? strValue : 'unknown';
      argInput = renderArgModel(modelId, model, defaultSelector, defaultValue);
    } else {
      return null;
    }

    const help =
      typeof argDefinition.help === 'string' ||
      typeof argDefinition.help === 'function'
        ? fnOrString(argDefinition.help, argDatas)
        : '';
    const displayName =
      typeof argDefinition.displayName === 'string' ||
      typeof argDefinition.displayName === 'function'
        ? fnOrString(argDefinition.displayName, argDatas)
        : '';
    let validationError = '';
    const canValidate =
      argDefinition.type === 'string' || argDefinition.type === 'number';

    if (canValidate && typeof argDefinition.validate === 'function') {
      validationError = argDefinition.validate(strValue) || '';
    }

    const formControlClasses = classNames({
      'form-control': true,
      'form-control--thin': argDefinition.type === 'boolean',
      'form-control--outlined': argDefinition.type !== 'boolean',
    });
    const type = argDefinition.argEditingType;
    return (
      <div key={argIndex} className='form-row'>
        <div className={formControlClasses}>
          <label data-arg-index={argIndex}>
            {fnOrString(displayName, argDatas)}
            {isVariable && <span className='faded space-left'>(Variable)</span>}
            {help && <HelpTooltip className='space-left'>{help}</HelpTooltip>}
            {validationError && (
              <span className='font-error space-left'>{validationError}</span>
            )}
            {argInput}
          </label>
        </div>
        {isVariableAllowed ? (
          <div
            className={classNames(
              'form-control form-control--outlined width-auto',
              {
                'form-control--no-label': argDefinition.type !== 'boolean',
              }
            )}
          >
            <Dropdown
              triggerButton={
                <DropdownButton className='btn btn--clicky'>
                  <i className='fa fa-cog' />
                </DropdownButton>
              }
            >
              <DropdownSection aria-label='Input Type' title='Input Type'>
                {/* <DropdownDivider>Input Type</DropdownDivider> */}
                <DropdownItem aria-label='Static Value'>
                  <ItemContent
                    icon={
                      type === ArgumentValueType.Literal ? 'check' : 'empty'
                    }
                    label='Static Value'
                    onClick={() =>
                      handleChangeArgVariable({
                        type: ArgumentValueType.Literal,
                        argIndex,
                      })
                    }
                  />
                </DropdownItem>
                <DropdownItem aria-label='Environment Variable'>
                  <ItemContent
                    icon={
                      type === ArgumentValueType.Environment ? 'check' : 'empty'
                    }
                    label='Environment Variable'
                    onClick={() =>
                      handleChangeArgVariable({
                        type: ArgumentValueType.Environment,
                        argIndex,
                      })
                    }
                  />
                </DropdownItem>
                <DropdownItem aria-label='Local Variable'>
                  <ItemContent
                    icon={
                      type === ArgumentValueType.Variable ? 'check' : 'empty'
                    }
                    label='Local Variable'
                    onClick={() =>
                      handleChangeArgVariable({
                        type: ArgumentValueType.Variable,
                        argIndex,
                      })
                    }
                  />
                </DropdownItem>
              </DropdownSection>
            </Dropdown>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {argsType.map((argDefinition, index) =>
        renderArg(argDefinition, argsType, index)
      )}
    </>
  );
};

export default PluginFilterArgumentsEditor;
