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

    const encodeBody = (body: string) =>

        'data:text/html;charset=UTF-8,' + encodeURIComponent(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Response visualizer</title>
            <meta charset="UTF-8">
          </head>
          <body>
            ${body}
          </body>
        </html>`);

    // <style>
    //     li > h5 {
    //         margin-bottom: 0;
    //     }
    //     li li.evt-body {
    //         margin-left: -40px;
    //         list-style-type: none;
    //         font-style: italic;
    //         font-size: 13px;
    //     }
    //     li li {
    //         margin-bottom: 5px;
    //     }
    //     </style>
    //     <h3>7218927f-aaaa-195d-98ae-bb8ce99ef57d</h3>
    //     hehe

    useEffect(() => {
        const loadFunc = async () => {
            if (!activeRequestMeta) {
                setState({ body: 'about:blank', visualizeTemplate: '', renderKey: state.renderKey + 1 });
                return;
            }

            const { visualizeTemplate } = activeRequestMeta;
            if (state.visualizeTemplate !== visualizeTemplate) {
                let tempBody;
                try {
                    tempBody = await handleRender("{\"transactionID\":\"7218927f-aaaa-195d-98ae-bb8ce99ef57d\",\"status\":\"INIT_SUCCESS\",\"bodyMessage\":{\"id\":\"7218927f-aaaa-195d-98ae-bb8ce99ef57d\",\"initiatorCompany\":\"ZC47560393\",\"initiatorCode\":\"ZU47560390\",\"site\":{\"siteCode\":\"ZS1000000000\",\"name\":\"TestSite190110\",\"address\":{\"addressLine1\":\"line1\",\"addressLine2\":\"line2\",\"city\":\" London\",\"countryCode\":\"GBR\",\"postCode\":\"EC1 2BU\",\"state\":\"Greater London\",\"siteCoordinates\":null,\"administrativeAreaLevel1\":null,\"administrativeAreaLevel2\":null,\"administrativeAreaLevel3\":null,\"locality\":null}},\"org\":{\"orgCode\":\"ZC1000000000\",\"name\":\"TestOrg190110\",\"address\":{\"addressLine1\":\"line1\",\"addressLine2\":\"line2\",\"city\":\" London\",\"countryCode\":\"GBR\",\"postCode\":\"EC1 2BU\",\"state\":\"Greater London\",\"siteCoordinates\":null,\"administrativeAreaLevel1\":null,\"administrativeAreaLevel2\":null,\"administrativeAreaLevel3\":null,\"locality\":null},\"billingAddress\":{\"addressLine1\":\"line1\",\"addressLine2\":\"line2\",\"city\":\" London\",\"countryCode\":\"GBR\",\"postCode\":\"EC1 2BU\",\"state\":\"Greater London\",\"siteCoordinates\":null,\"administrativeAreaLevel1\":null,\"administrativeAreaLevel2\":null,\"administrativeAreaLevel3\":null,\"locality\":null}},\"userDTO\":{\"email\":\"Test190110@gmail.com\",\"firstName\":\"An\",\"lastName\":\"Nguyen\",\"usersEmailPreferredLang\":\"EN\"}}}" || '');
                } catch (err) {
                    tempBody = `<h4 style="color:red;">${err.message}</h4>`;
                }
                setState({
                    body: encodeBody(tempBody),
                    visualizeTemplate: activeRequestMeta.visualizeTemplate || '',
                    renderKey: state.renderKey + 1,
                });
            }
        };
        loadFunc();
    }, []);

    return (
        <div>
            {/* eslint-disable-next-line react/no-unknown-property */}
            <webview src={state.body} key={state.renderKey} webpreferences={'javascript=no'} />
        </div>
    );
};
