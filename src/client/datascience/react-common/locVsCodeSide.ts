// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { localize } from '../../common/utils/localize';
import { IWebPanel, IWebPanelMessageListener } from '../../common/application/types';
import { LocalizationMessages } from './locCommon';

export class LocVsCodePostOffice implements IWebPanelMessageListener {

    private webPanel : IWebPanel;

    constructor(webPanel : IWebPanel) {
        this.webPanel = webPanel;
    }

    // tslint:disable-next-line:no-any
    public onMessage = (msg: string, payload? : any) => {
        if (msg === LocalizationMessages.send) {

            // Should have a key
            const key = payload;

            if (key) {
                // Get out of the real localize
                const result = localize(key, key)();

                // Send the response
                this.webPanel.postMessage({type: LocalizationMessages.response, payload: { key: key, result: result}});
            }
        }
    }

    // tslint:disable-next-line:no-empty
    public onDisposed = () => {
    }
}
