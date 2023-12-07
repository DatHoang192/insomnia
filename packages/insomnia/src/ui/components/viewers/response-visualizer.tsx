import React, { useEffect, useState } from 'react';
import { useRouteLoaderData } from 'react-router-dom';

import { useNunjucks } from '../../context/nunjucks/use-nunjucks';
import { RequestLoaderData } from '../../routes/request';

export const ResponseVisualizeViewer = () => {
    const { handleRender } = useNunjucks();
    const { activeRequestMeta } = useRouteLoaderData('request/:requestId') as RequestLoaderData;
    const [state, setState] = useState({
        body: 'about:blank',
        visualizeTemplate: '',
        renderKey: 1,
    });
    console.log(activeRequestMeta)
    // useEffect(() => {
    //     const load = async () => {
    //         if (!activeRequest) {
    //             setState({ body: 'about:blank', visualizeTemplate: '', renderKey: state.renderKey + 1 });
    //             return;
    //         }

    //         const { visualizeTemplate } = activeRequest;
    //         if (state.visualizeTemplate !== visualizeTemplate) {
    //             let body;
    //             try {
    //                 body = await handleRender(activeRequest.visualizeTemplate || '');
    //             } catch (err) {
    //                 body = `<h4 style="color:red;">${err.message}</h4>`;
    //             }
    //             body = encodeBody(body);
    //             setState({
    //                 body,
    //                 visualizeTemplate: activeRequest.visualizeTemplate || '',
    //                 renderKey: state.renderKey + 1,
    //             });
    //         }
    //     };

    //     load();
    // }, [activeRequest, state.renderKey]);

    const encodeBody = (body: string) => {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Response visualizer</title>
          <meta charset="UTF-8">
        </head>
        <body>
          ${body}
        </body>
      </html>`;
    };

    const { body, renderKey } = state;

    return (
        <div>
            <webview src={body} key={renderKey} webpreferences={'javascript=no'} />
        </div>
    );
};
