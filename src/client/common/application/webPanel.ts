// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { ViewColumn, WebviewPanel, window } from 'vscode';
import { IWebPanelMessageListener, IWebPanel } from './types';
import { IServiceContainer } from '../../ioc/types';

export class WebPanel implements IWebPanel {

    private listener: IWebPanelMessageListener;
    private panel: WebviewPanel;
    private loadPromise: Promise<void>;

    constructor(serviceContainer: IServiceContainer, listener: IWebPanelMessageListener, title: string, htmlPath:string) {
        this.listener = listener;
        window.createWebviewPanel(
            title.toLowerCase().replace(' ', ''), 
            title, 
            ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,

            });
    }

    public async show() {
        await this.loadPromise;
        if (this.panel) {
            this.panel.reveal(ViewColumn.Two);
        }
    }
}
